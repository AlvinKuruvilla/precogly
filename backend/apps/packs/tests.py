"""Tests for path-based pack discovery and validation (issue #33)."""

import tempfile
from pathlib import Path
from unittest import mock

import yaml
from django.test import SimpleTestCase

from apps.packs.services import (
    _find_pack_dir,
    _resolve_slug_to_path,
    discover_packs_from_source,
    validate_pack,
)


def _empty_pack_queryset():
    """Stand-in for LibraryPack.objects.all() that yields nothing.

    discover_packs_from_source() reads installed packs from the DB to
    flag is_in_database; tests covering on-disk discovery don't care
    about that signal, so we mock the queryset instead of spinning up a
    real database.
    """
    return iter([])


def _write_pack(base_dir: Path, relative_path: str, slug: str, **overrides) -> Path:
    """Create a minimal pack on disk under base_dir/relative_path.

    Writes a pack.yaml with a `path` field set to relative_path by
    default. Use overrides to change individual pack.yaml fields for
    negative tests (e.g. mismatched path, missing path).
    """
    pack_dir = base_dir / relative_path
    pack_dir.mkdir(parents=True, exist_ok=True)

    pack_meta = {
        "slug": slug,
        "path": relative_path,
        "name": slug,
        "version": "1.0.0",
        "pack_type": "technology",
        "tier": "free",
        "source": "official",
        "author": "Test",
    }
    pack_meta.update(overrides)

    # `path: None` is how callers signal "omit the path field"; drop it.
    if pack_meta.get("path") is None:
        del pack_meta["path"]

    pack_yaml = pack_dir / "pack.yaml"
    pack_yaml.write_text(yaml.safe_dump({"pack": pack_meta}))
    return pack_dir


class FindPackDirTests(SimpleTestCase):
    """The new _find_pack_dir is O(1) — it only checks the path it was given."""

    def test_resolves_top_level_pack(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            _write_pack(base, "aws", slug="aws")

            result = _find_pack_dir(base, "aws")

            self.assertEqual(result, base / "aws")

    def test_resolves_nested_pack(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            _write_pack(base, "frameworks/nist-csf", slug="nist-csf")

            result = _find_pack_dir(base, "frameworks/nist-csf")

            self.assertEqual(result, base / "frameworks" / "nist-csf")

    def test_returns_none_for_missing_path(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)

            self.assertIsNone(_find_pack_dir(base, "does-not-exist"))

    def test_returns_none_when_pack_yaml_absent(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            (base / "empty-dir").mkdir()

            self.assertIsNone(_find_pack_dir(base, "empty-dir"))

    def test_does_not_recursively_scan(self):
        # If two packs share a slug under different paths, _find_pack_dir
        # must return the directory at the requested path — not any
        # other matching slug elsewhere in the tree.
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            _write_pack(base, "frameworks/nist-csf", slug="nist-csf")
            _write_pack(base, "demo/nist-csf", slug="nist-csf")

            framework_dir = _find_pack_dir(base, "frameworks/nist-csf")
            demo_dir = _find_pack_dir(base, "demo/nist-csf")

            self.assertEqual(framework_dir, base / "frameworks" / "nist-csf")
            self.assertEqual(demo_dir, base / "demo" / "nist-csf")
            self.assertNotEqual(framework_dir, demo_dir)


class ValidatePackTests(SimpleTestCase):
    """validate_pack enforces the path invariants from issue #33."""

    def test_missing_path_field_is_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            with mock.patch(
                "apps.packs.services.get_libraries_path", return_value=base
            ):
                pack_dir = _write_pack(base, "aws", slug="aws", path=None)

                result = validate_pack(pack_dir)

                self.assertFalse(result.success)
                self.assertTrue(
                    any(
                        e.reference == "path"
                        and "Missing required field" in e.message
                        for e in result.errors
                    ),
                    f"Expected missing-path error, got: {[e.message for e in result.errors]}",
                )

    def test_folder_name_must_match_slug(self):
        # Pack lives at frameworks/my-custom-name but declares slug nist-csf;
        # the last segment of path should equal slug.
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            with mock.patch(
                "apps.packs.services.get_libraries_path", return_value=base
            ):
                pack_dir = _write_pack(
                    base,
                    "frameworks/my-custom-name",
                    slug="nist-csf",
                    path="frameworks/my-custom-name",
                )

                result = validate_pack(pack_dir)

                self.assertFalse(result.success)
                self.assertTrue(
                    any(
                        "does not match slug" in e.message for e in result.errors
                    ),
                    f"Expected folder/slug mismatch error, got: {[e.message for e in result.errors]}",
                )

    def test_declared_path_must_match_actual_location(self):
        # Pack lives at demo/nist-csf but declares path frameworks/nist-csf.
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            with mock.patch(
                "apps.packs.services.get_libraries_path", return_value=base
            ):
                pack_dir = _write_pack(
                    base,
                    "demo/nist-csf",
                    slug="nist-csf",
                    path="frameworks/nist-csf",
                )

                result = validate_pack(pack_dir)

                self.assertFalse(result.success)
                self.assertTrue(
                    any(
                        "does not match actual location" in e.message
                        for e in result.errors
                    ),
                    f"Expected location mismatch error, got: {[e.message for e in result.errors]}",
                )

    def test_valid_pack_passes_path_checks(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            with mock.patch(
                "apps.packs.services.get_libraries_path", return_value=base
            ):
                pack_dir = _write_pack(base, "frameworks/nist-csf", slug="nist-csf")

                result = validate_pack(pack_dir)

                # Should have no path-related errors. (Other errors —
                # e.g. missing taxonomies — are unrelated to issue #33.)
                path_errors = [
                    e for e in result.errors if e.reference == "path"
                ]
                self.assertEqual(
                    path_errors,
                    [],
                    f"Unexpected path errors: {[e.message for e in path_errors]}",
                )


class DiscoveryAndDisambiguationTests(SimpleTestCase):
    """discover_packs_from_source surfaces duplicate slugs without collapsing them."""

    def _patch_db_and_path(self, base):
        # discover_packs_from_source reads from LibraryPack.objects to
        # populate is_in_database. The tests here exercise on-disk
        # discovery, so we stub the queryset to avoid the database.
        return mock.patch.multiple(
            "apps.packs.services",
            get_libraries_path=mock.MagicMock(return_value=base),
            LibraryPack=mock.MagicMock(
                objects=mock.MagicMock(
                    all=mock.MagicMock(return_value=_empty_pack_queryset()),
                )
            ),
        )

    def test_duplicate_slugs_under_different_paths_are_both_discovered(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            with self._patch_db_and_path(base):
                _write_pack(base, "frameworks/nist-csf", slug="nist-csf")
                _write_pack(base, "demo/nist-csf", slug="nist-csf")

                packs = discover_packs_from_source()
                nist_packs = [p for p in packs if p.slug == "nist-csf"]

                self.assertEqual(len(nist_packs), 2)
                paths = {p.relative_path for p in nist_packs}
                self.assertEqual(
                    paths,
                    {"frameworks/nist-csf", "demo/nist-csf"},
                )

    def test_resolve_slug_returns_one_match_when_unique(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            with self._patch_db_and_path(base):
                _write_pack(base, "aws", slug="aws")

                self.assertEqual(_resolve_slug_to_path(base, "aws"), "aws")

    def test_discovery_warns_on_path_mismatch(self):
        # Pack lives at demo/nist-csf but declares frameworks/nist-csf.
        # Discovery should still surface the pack but log a warning so
        # it shows up in pack listings while signalling the problem.
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            with self._patch_db_and_path(base):
                _write_pack(
                    base,
                    "demo/nist-csf",
                    slug="nist-csf",
                    path="frameworks/nist-csf",
                )

                with self.assertLogs(
                    "apps.packs.services", level="WARNING"
                ) as cm:
                    packs = discover_packs_from_source()

                self.assertEqual(len(packs), 1)
                self.assertTrue(
                    any("does not match actual location" in msg for msg in cm.output),
                    f"Expected mismatch warning, got: {cm.output}",
                )

    def test_depends_on_with_path_disambiguates(self):
        # A pack depends on `nist-csf` and disambiguates which one via path.
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            with self._patch_db_and_path(base):
                _write_pack(base, "frameworks/nist-csf", slug="nist-csf")
                _write_pack(base, "demo/nist-csf", slug="nist-csf")
                _write_pack(
                    base,
                    "consumer",
                    slug="consumer",
                    depends_on=[
                        {
                            "pack": "nist-csf",
                            "path": "demo/nist-csf",
                            "version": "^1.0.0",
                        }
                    ],
                )

                packs = discover_packs_from_source()
                consumer = next(p for p in packs if p.slug == "consumer")

                self.assertEqual(len(consumer.depends_on), 1)
                dep = consumer.depends_on[0]
                self.assertEqual(dep["slug"], "nist-csf")
                self.assertEqual(dep["path"], "demo/nist-csf")
