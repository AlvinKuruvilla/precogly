from django.db.models.signals import post_delete
from django.dispatch import receiver


@receiver(post_delete, sender="threats.CountermeasureThreatLink")
def cleanup_orphaned_countermeasure(sender, instance, **kwargs):
    """Delete the parent InstanceCountermeasure if it has no remaining threat links.

    When a threat, component, or data flow is deleted, Django CASCADE-deletes
    the CountermeasureThreatLink rows but leaves the InstanceCountermeasure
    intact. This signal cleans up countermeasures that have lost all their links.
    """
    from apps.threats.models import InstanceCountermeasure

    try:
        countermeasure = InstanceCountermeasure.objects.get(pk=instance.countermeasure_id)
    except InstanceCountermeasure.DoesNotExist:
        return  # Already deleted (e.g., during threat model cascade)

    if countermeasure.threat_links.count() == 0:
        countermeasure.delete()
