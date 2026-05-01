"""Tests for path-based pack discovery and O(1) lookup (issue #33)."""

import tempfile
from pathlib import Path
from unittest import mock

import yaml
from django.test import SimpleTestCase

from apps.packs.services import (
    _find_pack_dir,
    discover_packs_from_source,
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
    """Create a minimal pack on disk under base_dir/relative_path."""
    pack_dir = base_dir / relative_path
    pack_dir.mkdir(parents=True, exist_ok=True)

    pack_meta = {
        "slug": slug,
        "name": slug,
        "version": "1.0.0",
        "pack_type": "technology",
        "tier": "free",
        "source": "official",
        "author": "Test",
    }
    pack_meta.update(overrides)

    pack_yaml = pack_dir / "pack.yaml"
    pack_yaml.write_text(yaml.safe_dump({"pack": pack_meta}))
    return pack_dir


class FindPackDirTests(SimpleTestCase):
    """_find_pack_dir is O(1): it only checks the path it was given."""

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
        # must return the directory at the requested path, not any
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


class DiscoveryAndDisambiguationTests(SimpleTestCase):
    """discover_packs_from_source computes relative_path from the filesystem."""

    def _patch_db_and_path(self, base):
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

    def test_relative_path_computed_from_filesystem(self):
        # relative_path should match the actual directory location,
        # regardless of what's in pack.yaml.
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            with self._patch_db_and_path(base):
                _write_pack(base, "frameworks/owasp", slug="owasp")

                packs = discover_packs_from_source()
                owasp = next(p for p in packs if p.slug == "owasp")

                self.assertEqual(owasp.relative_path, "frameworks/owasp")

    def test_depends_on_with_path_disambiguates(self):
        # A pack depends on nist-csf and disambiguates which one via path.
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
