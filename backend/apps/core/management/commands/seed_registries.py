"""
Management command to seed threat, countermeasure, and component library registries.

Data is imported from the frontend TypeScript definitions to ensure consistency.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.compliance.models import (
    CountermeasureLibraryStandard,
    StandardFramework,
    StandardRequirement,
)
from apps.diagrams.models import DFDTemplatesLibrary
from apps.systems.models import ComponentLibrary
from apps.threats.models import ComponentLibraryThreat, CountermeasureLibrary, ThreatLibrary


class Command(BaseCommand):
    help = "Seed threat, countermeasure, and component library registries"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing data before seeding",
        )

    def handle(self, *args, **options):
        clear = options["clear"]

        with transaction.atomic():
            if clear:
                self.stdout.write("Clearing existing registry data...")
                ComponentLibraryThreat.objects.all().delete()
                CountermeasureLibraryStandard.objects.all().delete()
                ThreatLibrary.objects.filter(organization__isnull=True).delete()
                CountermeasureLibrary.objects.filter(organization__isnull=True).delete()
                ComponentLibrary.objects.filter(organization__isnull=True).delete()
                StandardFramework.objects.all().delete()
                DFDTemplatesLibrary.objects.filter(organization__isnull=True).delete()

            self.seed_frameworks()
            self.seed_threat_library()
            self.seed_countermeasure_library()
            self.seed_component_library()
            self.seed_dfd_templates()
            self.seed_component_threat_mappings()
            self.seed_countermeasure_standard_mappings()

        self.stdout.write(self.style.SUCCESS("Successfully seeded all registries!"))

    def seed_frameworks(self):
        """Seed security/compliance frameworks."""
        frameworks = [
            {
                "name": "PCI-DSS",
                "version": "4.0",
                "issuer": "PCI Security Standards Council",
                "description": "Payment Card Industry Data Security Standard",
            },
            {
                "name": "SOC 2",
                "version": "2017",
                "issuer": "AICPA",
                "description": "Service Organization Control 2",
            },
            {
                "name": "ISO 27001",
                "version": "2022",
                "issuer": "ISO/IEC",
                "description": "Information Security Management System",
            },
            {
                "name": "NIST CSF",
                "version": "2.0",
                "issuer": "NIST",
                "description": "NIST Cybersecurity Framework",
            },
            {
                "name": "OWASP",
                "version": "2021",
                "issuer": "OWASP Foundation",
                "description": "Open Web Application Security Project Top 10",
            },
            {
                "name": "GDPR",
                "version": "2018",
                "issuer": "European Union",
                "description": "General Data Protection Regulation",
            },
            {
                "name": "HIPAA",
                "version": "1996",
                "issuer": "US HHS",
                "description": "Health Insurance Portability and Accountability Act",
            },
            {
                "name": "DORA",
                "version": "2022",
                "issuer": "European Union",
                "description": "Digital Operational Resilience Act",
            },
            {
                "name": "CRA",
                "version": "2024",
                "issuer": "European Union",
                "description": "Cyber Resilience Act",
            },
        ]

        created_count = 0
        for fw_data in frameworks:
            _, created = StandardFramework.objects.get_or_create(
                name=fw_data["name"],
                defaults=fw_data,
            )
            if created:
                created_count += 1

        self.stdout.write(f"  Frameworks: {created_count} created, {len(frameworks) - created_count} already exist")

    def seed_threat_library(self):
        """Seed threat library from frontend definitions."""
        # Threat definitions from frontend/src/features/dfd-editor/lib/threat-registry.ts
        threats = [
            # SPOOFING THREATS
            {"name": "Identity Spoofing", "description": "An attacker could impersonate a legitimate user or system to gain unauthorized access", "stride_category": "spoofing", "source": "stride"},
            {"name": "Session Hijacking", "description": "An attacker could steal or forge session tokens to impersonate authenticated users", "stride_category": "spoofing", "source": "stride"},
            {"name": "Credential Theft", "description": "Attackers could steal user credentials through phishing, keylogging, or credential stuffing", "stride_category": "spoofing", "source": "stride"},
            {"name": "API Key Compromise", "description": "API keys could be exposed in code repositories, logs, or network traffic", "stride_category": "spoofing", "source": "stride"},
            {"name": "Certificate Spoofing", "description": "Man-in-the-middle attacks using forged or stolen certificates", "stride_category": "spoofing", "source": "stride"},

            # TAMPERING THREATS
            {"name": "SQL Injection", "description": "Attackers could inject malicious SQL to read, modify, or delete database records", "stride_category": "tampering", "source": "owasp", "source_id": "A03:2021"},
            {"name": "Data Tampering", "description": "Unauthorized modification of data in transit or at rest", "stride_category": "tampering", "source": "stride"},
            {"name": "Message Tampering", "description": "Messages in queues or event streams could be modified by unauthorized parties", "stride_category": "tampering", "source": "stride"},
            {"name": "Configuration Tampering", "description": "Unauthorized modification of application or infrastructure configuration", "stride_category": "tampering", "source": "stride"},
            {"name": "Code Injection", "description": "Injection of malicious code through user inputs (XSS, command injection)", "stride_category": "tampering", "source": "owasp", "source_id": "A03:2021"},
            {"name": "Parameter Manipulation", "description": "Attackers could modify request parameters to bypass access controls", "stride_category": "tampering", "source": "stride"},

            # REPUDIATION THREATS
            {"name": "Repudiation of Actions", "description": "Users could deny having performed transactions or actions without proper audit trails", "stride_category": "repudiation", "source": "stride"},
            {"name": "Log Tampering", "description": "Attackers could modify or delete logs to hide their activities", "stride_category": "repudiation", "source": "stride"},
            {"name": "Insufficient Logging", "description": "Lack of comprehensive logging makes it impossible to trace malicious activities", "stride_category": "repudiation", "source": "owasp", "source_id": "A09:2021"},

            # INFORMATION DISCLOSURE THREATS
            {"name": "Sensitive Data Exposure", "description": "Sensitive data could be exposed through insecure storage, transmission, or error messages", "stride_category": "information_disclosure", "source": "owasp", "source_id": "A02:2021"},
            {"name": "Network Sniffing", "description": "Unencrypted network traffic could be intercepted to steal sensitive information", "stride_category": "information_disclosure", "source": "stride"},
            {"name": "Information Disclosure via Errors", "description": "Detailed error messages could reveal system internals to attackers", "stride_category": "information_disclosure", "source": "stride"},
            {"name": "Cache Data Leakage", "description": "Sensitive data in caches could be accessed by unauthorized parties", "stride_category": "information_disclosure", "source": "stride"},
            {"name": "Backup Data Exposure", "description": "Database backups or storage snapshots could be accessed without authorization", "stride_category": "information_disclosure", "source": "stride"},
            {"name": "Metadata Leakage", "description": "System metadata, headers, or debug information could reveal sensitive details", "stride_category": "information_disclosure", "source": "stride"},

            # DENIAL OF SERVICE THREATS
            {"name": "DDoS Attack", "description": "Distributed denial of service attacks could overwhelm the system", "stride_category": "denial_of_service", "source": "stride"},
            {"name": "Resource Exhaustion", "description": "Attackers could exhaust CPU, memory, disk, or network resources", "stride_category": "denial_of_service", "source": "stride"},
            {"name": "Message Queue Flooding", "description": "Flooding message queues with malicious messages to disrupt processing", "stride_category": "denial_of_service", "source": "stride"},
            {"name": "Database DoS", "description": "Complex queries or connection exhaustion could make databases unavailable", "stride_category": "denial_of_service", "source": "stride"},
            {"name": "Storage Exhaustion", "description": "Filling up storage capacity to prevent legitimate operations", "stride_category": "denial_of_service", "source": "stride"},

            # ELEVATION OF PRIVILEGE THREATS
            {"name": "Privilege Escalation", "description": "Attackers could gain higher privileges than authorized through vulnerabilities", "stride_category": "elevation_of_privilege", "source": "stride"},
            {"name": "Broken Access Control", "description": "Bypassing authorization checks to access unauthorized resources", "stride_category": "elevation_of_privilege", "source": "owasp", "source_id": "A01:2021"},
            {"name": "Insecure Deserialization", "description": "Exploiting deserialization vulnerabilities to execute arbitrary code", "stride_category": "elevation_of_privilege", "source": "owasp", "source_id": "A08:2021"},
            {"name": "Container Escape", "description": "Breaking out of container isolation to access the host system", "stride_category": "elevation_of_privilege", "source": "stride"},
            {"name": "IAM Misconfiguration", "description": "Overly permissive IAM policies could allow unauthorized access", "stride_category": "elevation_of_privilege", "source": "stride"},

            # DATA FLOW THREATS
            {"name": "Data Flow Denial of Service", "description": "An attacker could flood the data channel to disrupt communication between components", "stride_category": "denial_of_service", "source": "stride"},
            {"name": "Traffic Analysis", "description": "Traffic patterns could reveal sensitive information about system behavior even if data is encrypted", "stride_category": "information_disclosure", "source": "stride"},
            {"name": "Replay Attack", "description": "An attacker could capture and replay valid data transmissions to perform unauthorized actions", "stride_category": "spoofing", "source": "stride"},
            {"name": "Plaintext Credential Interception", "description": "Credentials transmitted in cleartext can be intercepted by network attackers", "stride_category": "information_disclosure", "source": "stride"},
            {"name": "Session Token Theft", "description": "Session tokens sent over unencrypted connections can be stolen and used to impersonate users", "stride_category": "spoofing", "source": "stride"},
            {"name": "Data Eavesdropping", "description": "Sensitive data transmitted without encryption can be intercepted and read by attackers", "stride_category": "information_disclosure", "source": "stride"},
            {"name": "Man-in-the-Middle Attack", "description": "An attacker can intercept and modify data in transit when encryption is not used", "stride_category": "tampering", "source": "stride"},

            # SECURITY CONTROL THREATS
            {"name": "Security Control Misconfiguration", "description": "Incorrectly configured security controls may fail to protect or block legitimate traffic", "stride_category": "tampering", "source": "owasp", "source_id": "A05:2021"},
            {"name": "Security Control Bypass", "description": "Attackers may find ways to bypass security controls through protocol tunneling or rule gaps", "stride_category": "elevation_of_privilege", "source": "stride"},
            {"name": "WAF Rule Bypass", "description": "Attackers may craft malformed requests that bypass WAF detection rules", "stride_category": "tampering", "source": "stride"},
            {"name": "API Gateway Auth Bypass", "description": "Authentication enforcement may be bypassed through header manipulation or endpoint misconfiguration", "stride_category": "spoofing", "source": "stride"},
            {"name": "Rate Limit Bypass", "description": "Rate limiting may be bypassed through IP rotation, header spoofing, or distributed requests", "stride_category": "denial_of_service", "source": "stride"},
        ]

        created_count = 0
        for threat_data in threats:
            _, created = ThreatLibrary.objects.get_or_create(
                name=threat_data["name"],
                organization=None,
                defaults=threat_data,
            )
            if created:
                created_count += 1

        self.stdout.write(f"  Threats: {created_count} created, {len(threats) - created_count} already exist")

    def seed_countermeasure_library(self):
        """Seed countermeasure library from frontend definitions."""
        # Countermeasure definitions from frontend/src/features/dfd-editor/lib/countermeasure-registry.ts
        countermeasures = [
            # AUTHENTICATION & IDENTITY
            {"name": "Strong Authentication", "description": "Implement robust authentication mechanisms including multi-factor authentication", "control_type": "technical", "cost": "medium"},
            {"name": "Authorization Controls", "description": "Verify permissions before granting access to resources or actions", "control_type": "technical", "cost": "low"},
            {"name": "Secure Session Management", "description": "Implement secure session handling with timeouts, rotation, and invalidation", "control_type": "technical", "cost": "low"},
            {"name": "API Key Management", "description": "Secure storage, rotation, and revocation of API keys", "control_type": "technical", "cost": "medium"},

            # INPUT VALIDATION & DATA INTEGRITY
            {"name": "Input Validation", "description": "Validate and sanitize all user inputs to prevent injection attacks", "control_type": "technical", "cost": "low"},
            {"name": "Parameterized Queries", "description": "Use parameterized queries or prepared statements for database access", "control_type": "technical", "cost": "low"},
            {"name": "Data Integrity Controls", "description": "Implement checksums, digital signatures, or HMACs to detect tampering", "control_type": "technical", "cost": "medium"},
            {"name": "Secure Deserialization", "description": "Validate and sanitize serialized data before deserialization", "control_type": "technical", "cost": "low"},

            # LOGGING & MONITORING
            {"name": "Security Logging", "description": "Log security-relevant events with sufficient detail for forensics", "control_type": "technical", "cost": "low"},
            {"name": "Security Monitoring", "description": "Monitor for suspicious activities and security anomalies", "control_type": "technical", "cost": "medium"},
            {"name": "Tamper-Proof Logging", "description": "Store logs in immutable, tamper-proof storage with integrity verification", "control_type": "technical", "cost": "medium"},

            # ENCRYPTION & DATA PROTECTION
            {"name": "Encryption at Rest", "description": "Encrypt sensitive data stored in databases, files, and backups", "control_type": "technical", "cost": "medium"},
            {"name": "Encryption in Transit", "description": "Use TLS/SSL for all network communications", "control_type": "technical", "cost": "low"},
            {"name": "Data Masking", "description": "Mask sensitive data in logs, error messages, and non-production environments", "control_type": "technical", "cost": "low"},
            {"name": "Cache Security", "description": "Implement proper cache controls and avoid caching sensitive data", "control_type": "technical", "cost": "low"},

            # AVAILABILITY & RESILIENCE
            {"name": "DDoS Protection", "description": "Implement DDoS mitigation at network and application layers", "control_type": "technical", "cost": "high"},
            {"name": "Rate Limiting", "description": "Implement rate limiting to prevent resource exhaustion", "control_type": "technical", "cost": "low"},
            {"name": "Resource Quotas", "description": "Set resource limits and quotas to prevent exhaustion attacks", "control_type": "technical", "cost": "low"},
            {"name": "Query Optimization", "description": "Implement query timeouts, pagination, and complexity limits", "control_type": "technical", "cost": "low"},

            # ACCESS CONTROL & PRIVILEGE
            {"name": "Least Privilege", "description": "Grant minimum necessary permissions for each role and service", "control_type": "procedural", "cost": "low"},
            {"name": "Role-Based Access Control", "description": "Implement RBAC with clearly defined roles and permissions", "control_type": "technical", "cost": "medium"},
            {"name": "Container Security", "description": "Implement container hardening, image scanning, and runtime security", "control_type": "technical", "cost": "medium"},
            {"name": "Infrastructure Security", "description": "Harden infrastructure with security groups, network policies, and segmentation", "control_type": "technical", "cost": "medium"},

            # DATA FLOW COUNTERMEASURES
            {"name": "TLS Encryption", "description": "Use TLS 1.2 or higher for all data in transit with strong cipher suites", "control_type": "technical", "cost": "low"},
            {"name": "Mutual TLS (mTLS)", "description": "Implement mutual TLS authentication to verify both client and server identities", "control_type": "technical", "cost": "medium"},
            {"name": "HTTP Strict Transport Security", "description": "Enable HSTS to prevent protocol downgrade attacks and force HTTPS connections", "control_type": "technical", "cost": "low"},
            {"name": "Certificate Pinning", "description": "Pin server certificates to prevent MITM attacks with forged certificates", "control_type": "technical", "cost": "medium"},
            {"name": "API Authentication", "description": "Authenticate all API calls using tokens, API keys, or certificates", "control_type": "technical", "cost": "low"},
            {"name": "Message Signing", "description": "Sign messages with digital signatures to ensure integrity and authenticity", "control_type": "technical", "cost": "medium"},
            {"name": "Replay Attack Protection", "description": "Use nonces, timestamps, or sequence numbers to prevent replay attacks", "control_type": "technical", "cost": "low"},
            {"name": "Strict CORS Policy", "description": "Configure restrictive CORS policies to prevent cross-origin attacks", "control_type": "technical", "cost": "low"},
            {"name": "Security Headers", "description": "Implement security headers (X-Frame-Options, CSP, X-Content-Type-Options)", "control_type": "technical", "cost": "low"},
            {"name": "Secure Cookie Attributes", "description": "Set Secure, HttpOnly, and SameSite attributes on all session cookies", "control_type": "technical", "cost": "low"},

            # TRUST BOUNDARY COUNTERMEASURES
            {"name": "Regular Rule Review", "description": "Periodic review and audit of firewall rules to remove unnecessary permissions", "control_type": "procedural", "cost": "low"},
            {"name": "Change Management Process", "description": "Formal change management for security control configuration changes", "control_type": "procedural", "cost": "low"},
            {"name": "Default Deny Policy", "description": "Implement default-deny rules, explicitly allowing only required traffic", "control_type": "technical", "cost": "low"},
            {"name": "Security Control Credential Management", "description": "Change default credentials, enforce strong passwords, use MFA for admin access", "control_type": "procedural", "cost": "low"},
            {"name": "Security Control Patching", "description": "Regular patching and updates for security control firmware/software", "control_type": "procedural", "cost": "low"},
            {"name": "Boundary Traffic Logging", "description": "Enable comprehensive logging of traffic and events at security boundaries", "control_type": "technical", "cost": "low"},
            {"name": "Managed Rule Sets", "description": "Use vendor-managed or OWASP rule sets with regular updates", "control_type": "technical", "cost": "medium"},
            {"name": "Micro-Segmentation", "description": "Implement micro-segmentation within zones to limit lateral movement", "control_type": "technical", "cost": "high"},
        ]

        created_count = 0
        for cm_data in countermeasures:
            _, created = CountermeasureLibrary.objects.get_or_create(
                name=cm_data["name"],
                organization=None,
                defaults=cm_data,
            )
            if created:
                created_count += 1

        self.stdout.write(f"  Countermeasures: {created_count} created, {len(countermeasures) - created_count} already exist")

    def seed_component_library(self):
        """Seed component library from frontend technology definitions."""
        # Map frontend technology categories to ComponentLibrary categories
        CATEGORY_MAP = {
            "database": "datastore",
            "storage": "datastore",
            "cache": "datastore",
            "backend": "process",
            "compute": "process",
            "messaging": "process",
            "frontend": "process",
            "networking": "process",
            "security": "process",
            "monitoring": "process",
            "auth": "process",
            "infrastructure": "external",
            "other": "process",
        }

        # Technology definitions from frontend/src/features/dfd-editor/lib/technology-registry.ts
        technologies = [
            # DATABASES
            {"id": "aws-rds-postgresql", "name": "AWS RDS (PostgreSQL)", "category": "database", "provider": "aws"},
            {"id": "aws-rds-mysql", "name": "AWS RDS (MySQL)", "category": "database", "provider": "aws"},
            {"id": "aws-aurora", "name": "AWS Aurora", "category": "database", "provider": "aws"},
            {"id": "aws-dynamodb", "name": "AWS DynamoDB", "category": "database", "provider": "aws"},
            {"id": "azure-sql", "name": "Azure SQL Database", "category": "database", "provider": "azure"},
            {"id": "azure-cosmosdb", "name": "Azure Cosmos DB", "category": "database", "provider": "azure"},
            {"id": "gcp-cloudsql-postgresql", "name": "GCP Cloud SQL (PostgreSQL)", "category": "database", "provider": "gcp"},
            {"id": "gcp-firestore", "name": "GCP Firestore", "category": "database", "provider": "gcp"},
            {"id": "postgresql", "name": "PostgreSQL", "category": "database", "provider": "generic"},
            {"id": "mysql", "name": "MySQL", "category": "database", "provider": "generic"},
            {"id": "mongodb", "name": "MongoDB", "category": "database", "provider": "generic"},
            {"id": "redis", "name": "Redis", "category": "database", "provider": "generic"},
            {"id": "elasticsearch", "name": "Elasticsearch", "category": "database", "provider": "generic"},

            # STORAGE
            {"id": "aws-s3", "name": "AWS S3", "category": "storage", "provider": "aws"},
            {"id": "aws-efs", "name": "AWS EFS", "category": "storage", "provider": "aws"},
            {"id": "azure-blob", "name": "Azure Blob Storage", "category": "storage", "provider": "azure"},
            {"id": "gcp-storage", "name": "GCP Cloud Storage", "category": "storage", "provider": "gcp"},

            # CACHE
            {"id": "aws-elasticache-redis", "name": "AWS ElastiCache (Redis)", "category": "cache", "provider": "aws"},
            {"id": "azure-cache-redis", "name": "Azure Cache for Redis", "category": "cache", "provider": "azure"},
            {"id": "gcp-memorystore", "name": "GCP Memorystore", "category": "cache", "provider": "gcp"},
            {"id": "memcached", "name": "Memcached", "category": "cache", "provider": "generic"},

            # COMPUTE
            {"id": "aws-lambda", "name": "AWS Lambda", "category": "compute", "provider": "aws"},
            {"id": "aws-ecs", "name": "AWS ECS", "category": "compute", "provider": "aws"},
            {"id": "aws-eks", "name": "AWS EKS", "category": "compute", "provider": "aws"},
            {"id": "aws-ec2", "name": "AWS EC2", "category": "compute", "provider": "aws"},
            {"id": "azure-functions", "name": "Azure Functions", "category": "compute", "provider": "azure"},
            {"id": "azure-aks", "name": "Azure AKS", "category": "compute", "provider": "azure"},
            {"id": "azure-app-service", "name": "Azure App Service", "category": "compute", "provider": "azure"},
            {"id": "gcp-functions", "name": "GCP Cloud Functions", "category": "compute", "provider": "gcp"},
            {"id": "gcp-run", "name": "GCP Cloud Run", "category": "compute", "provider": "gcp"},
            {"id": "gcp-gke", "name": "GCP GKE", "category": "compute", "provider": "gcp"},
            {"id": "kubernetes", "name": "Kubernetes", "category": "compute", "provider": "generic"},
            {"id": "docker", "name": "Docker", "category": "compute", "provider": "generic"},

            # BACKEND FRAMEWORKS
            {"id": "nodejs", "name": "Node.js", "category": "backend", "provider": "generic"},
            {"id": "python", "name": "Python", "category": "backend", "provider": "generic"},
            {"id": "java", "name": "Java", "category": "backend", "provider": "generic"},
            {"id": "dotnet", "name": ".NET", "category": "backend", "provider": "generic"},
            {"id": "go", "name": "Go", "category": "backend", "provider": "generic"},
            {"id": "django", "name": "Django", "category": "backend", "provider": "generic"},
            {"id": "fastapi", "name": "FastAPI", "category": "backend", "provider": "generic"},
            {"id": "express", "name": "Express.js", "category": "backend", "provider": "generic"},
            {"id": "springboot", "name": "Spring Boot", "category": "backend", "provider": "generic"},

            # MESSAGING
            {"id": "aws-sqs", "name": "AWS SQS", "category": "messaging", "provider": "aws"},
            {"id": "aws-sns", "name": "AWS SNS", "category": "messaging", "provider": "aws"},
            {"id": "aws-eventbridge", "name": "AWS EventBridge", "category": "messaging", "provider": "aws"},
            {"id": "azure-servicebus", "name": "Azure Service Bus", "category": "messaging", "provider": "azure"},
            {"id": "azure-eventhubs", "name": "Azure Event Hubs", "category": "messaging", "provider": "azure"},
            {"id": "gcp-pubsub", "name": "GCP Pub/Sub", "category": "messaging", "provider": "gcp"},
            {"id": "kafka", "name": "Apache Kafka", "category": "messaging", "provider": "generic"},
            {"id": "rabbitmq", "name": "RabbitMQ", "category": "messaging", "provider": "generic"},

            # NETWORKING
            {"id": "aws-alb", "name": "AWS ALB", "category": "networking", "provider": "aws"},
            {"id": "aws-cloudfront", "name": "AWS CloudFront", "category": "networking", "provider": "aws"},
            {"id": "aws-api-gateway", "name": "AWS API Gateway", "category": "networking", "provider": "aws"},
            {"id": "azure-frontdoor", "name": "Azure Front Door", "category": "networking", "provider": "azure"},
            {"id": "azure-apim", "name": "Azure API Management", "category": "networking", "provider": "azure"},
            {"id": "gcp-lb", "name": "GCP Cloud Load Balancing", "category": "networking", "provider": "gcp"},
            {"id": "nginx", "name": "NGINX", "category": "networking", "provider": "generic"},
            {"id": "cloudflare", "name": "Cloudflare", "category": "networking", "provider": "generic"},
            {"id": "kong", "name": "Kong", "category": "networking", "provider": "generic"},

            # AUTH
            {"id": "aws-cognito", "name": "AWS Cognito", "category": "auth", "provider": "aws"},
            {"id": "azure-ad", "name": "Azure Active Directory", "category": "auth", "provider": "azure"},
            {"id": "gcp-identity", "name": "GCP Identity Platform", "category": "auth", "provider": "gcp"},
            {"id": "auth0", "name": "Auth0", "category": "auth", "provider": "generic"},
            {"id": "okta", "name": "Okta", "category": "auth", "provider": "generic"},
            {"id": "keycloak", "name": "Keycloak", "category": "auth", "provider": "generic"},

            # SECURITY
            {"id": "aws-waf", "name": "AWS WAF", "category": "security", "provider": "aws"},
            {"id": "aws-shield", "name": "AWS Shield", "category": "security", "provider": "aws"},
            {"id": "aws-guardduty", "name": "AWS GuardDuty", "category": "security", "provider": "aws"},
            {"id": "aws-kms", "name": "AWS KMS", "category": "security", "provider": "aws"},
            {"id": "azure-waf", "name": "Azure WAF", "category": "security", "provider": "azure"},
            {"id": "azure-keyvault", "name": "Azure Key Vault", "category": "security", "provider": "azure"},
            {"id": "azure-defender", "name": "Microsoft Defender", "category": "security", "provider": "azure"},
            {"id": "gcp-cloud-armor", "name": "GCP Cloud Armor", "category": "security", "provider": "gcp"},
            {"id": "gcp-kms", "name": "GCP Cloud KMS", "category": "security", "provider": "gcp"},
            {"id": "hashicorp-vault", "name": "HashiCorp Vault", "category": "security", "provider": "generic"},

            # MONITORING
            {"id": "aws-cloudwatch", "name": "AWS CloudWatch", "category": "monitoring", "provider": "aws"},
            {"id": "azure-monitor", "name": "Azure Monitor", "category": "monitoring", "provider": "azure"},
            {"id": "gcp-monitoring", "name": "GCP Cloud Monitoring", "category": "monitoring", "provider": "gcp"},
            {"id": "datadog", "name": "Datadog", "category": "monitoring", "provider": "generic"},
            {"id": "prometheus", "name": "Prometheus", "category": "monitoring", "provider": "generic"},
            {"id": "grafana", "name": "Grafana", "category": "monitoring", "provider": "generic"},
            {"id": "splunk", "name": "Splunk", "category": "monitoring", "provider": "generic"},

            # INFRASTRUCTURE
            {"id": "aws", "name": "AWS", "category": "infrastructure", "provider": "aws"},
            {"id": "azure", "name": "Microsoft Azure", "category": "infrastructure", "provider": "azure"},
            {"id": "gcp", "name": "Google Cloud", "category": "infrastructure", "provider": "gcp"},
            {"id": "on-premise", "name": "On-Premise", "category": "infrastructure", "provider": "generic"},
        ]

        created_count = 0
        for tech in technologies:
            component_category = CATEGORY_MAP.get(tech["category"], "process")
            _, created = ComponentLibrary.objects.get_or_create(
                name=tech["name"],
                organization=None,
                defaults={
                    "category": component_category,
                    "component_type": tech["id"],
                    "provider": tech["provider"],
                },
            )
            if created:
                created_count += 1

        self.stdout.write(f"  Components: {created_count} created, {len(technologies) - created_count} already exist")

    def seed_dfd_templates(self):
        """Seed DFD templates library."""
        templates = [
            {
                "name": "Basic Web Application",
                "description": "Standard 3-tier web application with user, frontend, backend, and database",
                "category": "webapp",
                "diagram_type": "level1",
                "canvas_data": {
                    "nodes": [
                        {"id": "actor-1", "type": "actor", "position": {"x": 50, "y": 150}, "data": {"label": "User"}},
                        {"id": "process-1", "type": "process", "position": {"x": 250, "y": 130}, "data": {"label": "Web Frontend", "technology": "React"}},
                        {"id": "process-2", "type": "process", "position": {"x": 450, "y": 130}, "data": {"label": "API Backend", "technology": "Node.js"}},
                        {"id": "datastore-1", "type": "datastore", "position": {"x": 450, "y": 300}, "data": {"label": "Database", "technology": "PostgreSQL"}},
                    ],
                    "edges": [
                        {"id": "edge-1", "source": "actor-1", "target": "process-1", "type": "dataFlow", "data": {"protocol": "HTTPS", "encrypted": True}},
                        {"id": "edge-2", "source": "process-1", "target": "process-2", "type": "dataFlow", "data": {"protocol": "HTTPS", "encrypted": True}},
                        {"id": "edge-3", "source": "process-2", "target": "datastore-1", "type": "dataFlow", "data": {"protocol": "SQL", "encrypted": True}},
                    ],
                },
            },
            {
                "name": "Microservices with API Gateway",
                "description": "Microservices architecture with API gateway, service mesh, and shared database",
                "category": "microservices",
                "diagram_type": "level1",
                "canvas_data": {
                    "nodes": [
                        {"id": "actor-1", "type": "actor", "position": {"x": 50, "y": 200}, "data": {"label": "Client"}},
                        {"id": "process-1", "type": "process", "position": {"x": 250, "y": 180}, "data": {"label": "API Gateway", "technology": "Kong"}},
                        {"id": "process-2", "type": "process", "position": {"x": 500, "y": 100}, "data": {"label": "Service A", "technology": "Go"}},
                        {"id": "process-3", "type": "process", "position": {"x": 500, "y": 250}, "data": {"label": "Service B", "technology": "Node.js"}},
                        {"id": "datastore-1", "type": "datastore", "position": {"x": 700, "y": 180}, "data": {"label": "Shared DB", "technology": "PostgreSQL"}},
                        {"id": "trust-boundary-1", "type": "trustBoundary", "position": {"x": 200, "y": 50}, "style": {"width": 550, "height": 300}, "data": {"label": "Kubernetes Cluster"}},
                    ],
                    "edges": [
                        {"id": "edge-1", "source": "actor-1", "target": "process-1", "type": "dataFlow", "data": {"protocol": "HTTPS", "encrypted": True}},
                        {"id": "edge-2", "source": "process-1", "target": "process-2", "type": "dataFlow", "data": {"protocol": "gRPC", "encrypted": True}},
                        {"id": "edge-3", "source": "process-1", "target": "process-3", "type": "dataFlow", "data": {"protocol": "gRPC", "encrypted": True}},
                        {"id": "edge-4", "source": "process-2", "target": "datastore-1", "type": "dataFlow", "data": {"protocol": "SQL", "encrypted": True}},
                        {"id": "edge-5", "source": "process-3", "target": "datastore-1", "type": "dataFlow", "data": {"protocol": "SQL", "encrypted": True}},
                    ],
                },
            },
            {
                "name": "AWS Serverless",
                "description": "Serverless architecture with Lambda, API Gateway, and DynamoDB",
                "category": "webapp",
                "diagram_type": "level1",
                "canvas_data": {
                    "nodes": [
                        {"id": "actor-1", "type": "actor", "position": {"x": 50, "y": 150}, "data": {"label": "Client"}},
                        {"id": "process-1", "type": "process", "position": {"x": 250, "y": 130}, "data": {"label": "API Gateway", "technology": "AWS API Gateway"}},
                        {"id": "process-2", "type": "process", "position": {"x": 450, "y": 130}, "data": {"label": "Lambda Function", "technology": "AWS Lambda"}},
                        {"id": "datastore-1", "type": "datastore", "position": {"x": 650, "y": 130}, "data": {"label": "DynamoDB", "technology": "AWS DynamoDB"}},
                        {"id": "trust-boundary-1", "type": "trustBoundary", "position": {"x": 200, "y": 50}, "style": {"width": 500, "height": 200}, "data": {"label": "AWS VPC", "trustLevel": "private_secured"}},
                    ],
                    "edges": [
                        {"id": "edge-1", "source": "actor-1", "target": "process-1", "type": "dataFlow", "data": {"protocol": "HTTPS", "encrypted": True}},
                        {"id": "edge-2", "source": "process-1", "target": "process-2", "type": "dataFlow", "data": {"protocol": "HTTPS", "encrypted": True}},
                        {"id": "edge-3", "source": "process-2", "target": "datastore-1", "type": "dataFlow", "data": {"protocol": "HTTPS", "encrypted": True}},
                    ],
                },
            },
            {
                "name": "Mobile Backend",
                "description": "Mobile application backend with authentication and push notifications",
                "category": "mobile",
                "diagram_type": "level1",
                "canvas_data": {
                    "nodes": [
                        {"id": "actor-1", "type": "actor", "position": {"x": 50, "y": 150}, "data": {"label": "Mobile App"}},
                        {"id": "process-1", "type": "process", "position": {"x": 250, "y": 100}, "data": {"label": "Auth Service", "technology": "Auth0"}},
                        {"id": "process-2", "type": "process", "position": {"x": 250, "y": 200}, "data": {"label": "API Backend", "technology": "Node.js"}},
                        {"id": "process-3", "type": "process", "position": {"x": 450, "y": 100}, "data": {"label": "Push Service", "technology": "Firebase"}},
                        {"id": "datastore-1", "type": "datastore", "position": {"x": 450, "y": 250}, "data": {"label": "Database", "technology": "MongoDB"}},
                    ],
                    "edges": [
                        {"id": "edge-1", "source": "actor-1", "target": "process-1", "type": "dataFlow", "data": {"protocol": "HTTPS", "encrypted": True}},
                        {"id": "edge-2", "source": "actor-1", "target": "process-2", "type": "dataFlow", "data": {"protocol": "HTTPS", "encrypted": True}},
                        {"id": "edge-3", "source": "process-2", "target": "process-3", "type": "dataFlow", "data": {"protocol": "HTTPS", "encrypted": True}},
                        {"id": "edge-4", "source": "process-2", "target": "datastore-1", "type": "dataFlow", "data": {"protocol": "MongoDB", "encrypted": True}},
                    ],
                },
            },
            {
                "name": "Event-Driven Architecture",
                "description": "Event-driven system with message queues and event processors",
                "category": "microservices",
                "diagram_type": "level1",
                "canvas_data": {
                    "nodes": [
                        {"id": "actor-1", "type": "actor", "position": {"x": 50, "y": 150}, "data": {"label": "Producer"}},
                        {"id": "process-1", "type": "process", "position": {"x": 250, "y": 150}, "data": {"label": "Event Bus", "technology": "Apache Kafka"}},
                        {"id": "process-2", "type": "process", "position": {"x": 450, "y": 80}, "data": {"label": "Consumer A", "technology": "Python"}},
                        {"id": "process-3", "type": "process", "position": {"x": 450, "y": 220}, "data": {"label": "Consumer B", "technology": "Go"}},
                        {"id": "datastore-1", "type": "datastore", "position": {"x": 650, "y": 80}, "data": {"label": "Analytics DB", "technology": "Elasticsearch"}},
                        {"id": "datastore-2", "type": "datastore", "position": {"x": 650, "y": 220}, "data": {"label": "Operational DB", "technology": "PostgreSQL"}},
                    ],
                    "edges": [
                        {"id": "edge-1", "source": "actor-1", "target": "process-1", "type": "dataFlow", "data": {"protocol": "Kafka", "encrypted": True}},
                        {"id": "edge-2", "source": "process-1", "target": "process-2", "type": "dataFlow", "data": {"protocol": "Kafka", "encrypted": True}},
                        {"id": "edge-3", "source": "process-1", "target": "process-3", "type": "dataFlow", "data": {"protocol": "Kafka", "encrypted": True}},
                        {"id": "edge-4", "source": "process-2", "target": "datastore-1", "type": "dataFlow", "data": {"protocol": "HTTPS", "encrypted": True}},
                        {"id": "edge-5", "source": "process-3", "target": "datastore-2", "type": "dataFlow", "data": {"protocol": "SQL", "encrypted": True}},
                    ],
                },
            },
        ]

        created_count = 0
        for template_data in templates:
            _, created = DFDTemplatesLibrary.objects.get_or_create(
                name=template_data["name"],
                organization=None,
                defaults=template_data,
            )
            if created:
                created_count += 1

        self.stdout.write(f"  DFD Templates: {created_count} created, {len(templates) - created_count} already exist")

    def seed_component_threat_mappings(self):
        """Seed mappings between component library and threat library."""
        # Define which threats apply to which component categories
        category_threat_mappings = {
            "datastore": [
                "SQL Injection",
                "Sensitive Data Exposure",
                "Backup Data Exposure",
                "Database DoS",
                "Data Tampering",
            ],
            "process": [
                "Code Injection",
                "Privilege Escalation",
                "Broken Access Control",
                "Insecure Deserialization",
                "DDoS Attack",
                "Resource Exhaustion",
                "Identity Spoofing",
                "Session Hijacking",
            ],
            "external": [
                "Identity Spoofing",
                "Credential Theft",
                "Man-in-the-Middle Attack",
            ],
        }

        created_count = 0
        for category, threat_names in category_threat_mappings.items():
            components = ComponentLibrary.objects.filter(
                category=category,
                organization__isnull=True,
            )
            threats = ThreatLibrary.objects.filter(
                name__in=threat_names,
                organization__isnull=True,
            )

            for component in components:
                for threat in threats:
                    _, created = ComponentLibraryThreat.objects.get_or_create(
                        component_library=component,
                        threat_library=threat,
                        defaults={
                            "default_severity": "medium",
                            "applies_to": "component",
                        },
                    )
                    if created:
                        created_count += 1

        self.stdout.write(f"  Component-Threat Mappings: {created_count} created")

    def seed_countermeasure_standard_mappings(self):
        """Seed mappings between countermeasures and compliance standards."""
        # Map countermeasures to framework requirements
        # Format: {countermeasure_name: [(framework_name, section_code, sufficiency), ...]}
        mappings = {
            "Strong Authentication": [
                ("PCI-DSS", "8.3", "full"),
                ("SOC 2", "CC6.1", "partial"),
                ("NIST CSF", "PR.AC-1", "partial"),
            ],
            "Encryption at Rest": [
                ("PCI-DSS", "3.4", "full"),
                ("GDPR", "Art. 32", "partial"),
                ("HIPAA", "164.312(a)(2)(iv)", "full"),
            ],
            "Encryption in Transit": [
                ("PCI-DSS", "4.1", "full"),
                ("GDPR", "Art. 32", "partial"),
                ("OWASP", "A02:2021", "partial"),
            ],
            "Input Validation": [
                ("OWASP", "A03:2021", "partial"),
                ("PCI-DSS", "6.5.1", "full"),
            ],
            "Security Logging": [
                ("PCI-DSS", "10.2", "full"),
                ("SOC 2", "CC7.2", "partial"),
                ("OWASP", "A09:2021", "partial"),
            ],
            "Rate Limiting": [
                ("OWASP", "A04:2021", "partial"),
                ("DORA", "Art. 9", "partial"),
            ],
            "DDoS Protection": [
                ("DORA", "Art. 9", "partial"),
                ("NIST CSF", "PR.DS-4", "partial"),
            ],
            "Role-Based Access Control": [
                ("PCI-DSS", "7.2", "full"),
                ("SOC 2", "CC6.2", "partial"),
            ],
            "Least Privilege": [
                ("PCI-DSS", "7.1", "full"),
                ("SOC 2", "CC6.1", "partial"),
                ("NIST CSF", "PR.AC-4", "partial"),
            ],
            "TLS Encryption": [
                ("PCI-DSS", "4.1", "full"),
                ("NIST CSF", "SC-8", "partial"),
                ("GDPR", "Art. 32", "partial"),
            ],
        }

        # First, ensure we have the requirement records
        created_req_count = 0
        for cm_name, frameworks_list in mappings.items():
            for framework_name, section_code, _ in frameworks_list:
                framework = StandardFramework.objects.filter(name=framework_name).first()
                if framework:
                    _, created = StandardRequirement.objects.get_or_create(
                        framework=framework,
                        section_code=section_code,
                        defaults={
                            "description": f"{framework_name} requirement {section_code}",
                        },
                    )
                    if created:
                        created_req_count += 1

        self.stdout.write(f"  Standard Requirements: {created_req_count} created")

        # Now create the mappings
        created_mapping_count = 0
        for cm_name, frameworks_list in mappings.items():
            countermeasure = CountermeasureLibrary.objects.filter(
                name=cm_name,
                organization__isnull=True,
            ).first()

            if not countermeasure:
                continue

            for framework_name, section_code, sufficiency in frameworks_list:
                requirement = StandardRequirement.objects.filter(
                    framework__name=framework_name,
                    section_code=section_code,
                ).first()

                if requirement:
                    _, created = CountermeasureLibraryStandard.objects.get_or_create(
                        countermeasure_library=countermeasure,
                        requirement=requirement,
                        defaults={"sufficiency": sufficiency},
                    )
                    if created:
                        created_mapping_count += 1

        self.stdout.write(f"  Countermeasure-Standard Mappings: {created_mapping_count} created")
