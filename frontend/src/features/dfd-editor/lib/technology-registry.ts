import type { DiagramNodeType } from '../types'

export interface Technology {
  id: string
  name: string
  category: TechnologyCategory
  description?: string
  icon?: string
  vendor?: 'aws' | 'azure' | 'gcp' | 'generic'
}

export type TechnologyCategory =
  | 'database'
  | 'backend'
  | 'frontend'
  | 'infrastructure'
  | 'messaging'
  | 'cache'
  | 'storage'
  | 'auth'
  | 'monitoring'
  | 'compute'
  | 'networking'
  | 'other'

// Map diagram node types to relevant technology categories
export const NODE_TYPE_CATEGORIES: Record<DiagramNodeType, TechnologyCategory[]> = {
  datastore: ['database', 'storage', 'cache'],
  process: ['compute', 'backend', 'messaging'],
  actor: [], // Actors typically don't have technologies
  trustBoundary: ['networking', 'infrastructure', 'auth'],
  systemBoundary: ['infrastructure', 'networking'],
}

export const TECHNOLOGY_CATEGORIES: Record<TechnologyCategory, { label: string; color: string }> = {
  database: { label: 'Database', color: '#9333ea' },
  backend: { label: 'Backend', color: '#2563eb' },
  frontend: { label: 'Frontend', color: '#16a34a' },
  infrastructure: { label: 'Infrastructure', color: '#ea580c' },
  messaging: { label: 'Messaging', color: '#0891b2' },
  cache: { label: 'Cache', color: '#dc2626' },
  storage: { label: 'Storage', color: '#7c3aed' },
  auth: { label: 'Auth', color: '#ca8a04' },
  monitoring: { label: 'Monitoring', color: '#64748b' },
  compute: { label: 'Compute', color: '#0d9488' },
  networking: { label: 'Networking', color: '#c026d3' },
  other: { label: 'Other', color: '#475569' },
}

// Common technology registry with vendor-specific offerings
export const TECHNOLOGIES: Technology[] = [
  // ===========================================
  // DATABASES (for DataStore nodes)
  // ===========================================

  // AWS Databases
  { id: 'aws-rds-postgresql', name: 'AWS RDS (PostgreSQL)', category: 'database', vendor: 'aws', description: 'Managed PostgreSQL database' },
  { id: 'aws-rds-mysql', name: 'AWS RDS (MySQL)', category: 'database', vendor: 'aws', description: 'Managed MySQL database' },
  { id: 'aws-aurora', name: 'AWS Aurora', category: 'database', vendor: 'aws', description: 'High-performance managed database' },
  { id: 'aws-dynamodb', name: 'AWS DynamoDB', category: 'database', vendor: 'aws', description: 'Managed NoSQL database' },
  { id: 'aws-redshift', name: 'AWS Redshift', category: 'database', vendor: 'aws', description: 'Data warehouse' },
  { id: 'aws-documentdb', name: 'AWS DocumentDB', category: 'database', vendor: 'aws', description: 'MongoDB-compatible document DB' },

  // Azure Databases
  { id: 'azure-sql', name: 'Azure SQL Database', category: 'database', vendor: 'azure', description: 'Managed SQL Server database' },
  { id: 'azure-cosmosdb', name: 'Azure Cosmos DB', category: 'database', vendor: 'azure', description: 'Multi-model NoSQL database' },
  { id: 'azure-postgresql', name: 'Azure Database for PostgreSQL', category: 'database', vendor: 'azure', description: 'Managed PostgreSQL' },
  { id: 'azure-mysql', name: 'Azure Database for MySQL', category: 'database', vendor: 'azure', description: 'Managed MySQL' },
  { id: 'azure-synapse', name: 'Azure Synapse Analytics', category: 'database', vendor: 'azure', description: 'Analytics data warehouse' },

  // GCP Databases
  { id: 'gcp-cloudsql-postgresql', name: 'GCP Cloud SQL (PostgreSQL)', category: 'database', vendor: 'gcp', description: 'Managed PostgreSQL' },
  { id: 'gcp-cloudsql-mysql', name: 'GCP Cloud SQL (MySQL)', category: 'database', vendor: 'gcp', description: 'Managed MySQL' },
  { id: 'gcp-firestore', name: 'GCP Firestore', category: 'database', vendor: 'gcp', description: 'Serverless document database' },
  { id: 'gcp-bigtable', name: 'GCP Bigtable', category: 'database', vendor: 'gcp', description: 'Wide-column NoSQL database' },
  { id: 'gcp-bigquery', name: 'GCP BigQuery', category: 'database', vendor: 'gcp', description: 'Serverless data warehouse' },
  { id: 'gcp-spanner', name: 'GCP Cloud Spanner', category: 'database', vendor: 'gcp', description: 'Globally distributed database' },

  // Generic Databases
  { id: 'postgresql', name: 'PostgreSQL', category: 'database', vendor: 'generic', description: 'Open source relational database' },
  { id: 'mysql', name: 'MySQL', category: 'database', vendor: 'generic', description: 'Popular open source database' },
  { id: 'mongodb', name: 'MongoDB', category: 'database', vendor: 'generic', description: 'NoSQL document database' },
  { id: 'redis', name: 'Redis', category: 'database', vendor: 'generic', description: 'In-memory data store' },
  { id: 'elasticsearch', name: 'Elasticsearch', category: 'database', vendor: 'generic', description: 'Search and analytics engine' },
  { id: 'cassandra', name: 'Apache Cassandra', category: 'database', vendor: 'generic', description: 'Distributed NoSQL database' },
  { id: 'mssql', name: 'SQL Server', category: 'database', vendor: 'generic', description: 'Microsoft relational database' },

  // ===========================================
  // STORAGE (for DataStore nodes)
  // ===========================================

  // AWS Storage
  { id: 'aws-s3', name: 'AWS S3', category: 'storage', vendor: 'aws', description: 'Object storage service' },
  { id: 'aws-efs', name: 'AWS EFS', category: 'storage', vendor: 'aws', description: 'Elastic file system' },
  { id: 'aws-fsx', name: 'AWS FSx', category: 'storage', vendor: 'aws', description: 'Managed file storage' },

  // Azure Storage
  { id: 'azure-blob', name: 'Azure Blob Storage', category: 'storage', vendor: 'azure', description: 'Object storage' },
  { id: 'azure-files', name: 'Azure Files', category: 'storage', vendor: 'azure', description: 'Managed file shares' },
  { id: 'azure-datalake', name: 'Azure Data Lake', category: 'storage', vendor: 'azure', description: 'Big data storage' },

  // GCP Storage
  { id: 'gcp-storage', name: 'GCP Cloud Storage', category: 'storage', vendor: 'gcp', description: 'Object storage' },
  { id: 'gcp-filestore', name: 'GCP Filestore', category: 'storage', vendor: 'gcp', description: 'Managed file storage' },

  // ===========================================
  // CACHE (for DataStore nodes)
  // ===========================================

  { id: 'aws-elasticache-redis', name: 'AWS ElastiCache (Redis)', category: 'cache', vendor: 'aws', description: 'Managed Redis cache' },
  { id: 'aws-elasticache-memcached', name: 'AWS ElastiCache (Memcached)', category: 'cache', vendor: 'aws', description: 'Managed Memcached' },
  { id: 'azure-cache-redis', name: 'Azure Cache for Redis', category: 'cache', vendor: 'azure', description: 'Managed Redis cache' },
  { id: 'gcp-memorystore', name: 'GCP Memorystore', category: 'cache', vendor: 'gcp', description: 'Managed Redis/Memcached' },
  { id: 'redis-generic', name: 'Redis', category: 'cache', vendor: 'generic', description: 'In-memory cache' },
  { id: 'memcached', name: 'Memcached', category: 'cache', vendor: 'generic', description: 'Distributed memory cache' },

  // ===========================================
  // COMPUTE (for Process nodes)
  // ===========================================

  // AWS Compute
  { id: 'aws-lambda', name: 'AWS Lambda', category: 'compute', vendor: 'aws', description: 'Serverless functions' },
  { id: 'aws-ecs', name: 'AWS ECS', category: 'compute', vendor: 'aws', description: 'Container orchestration' },
  { id: 'aws-eks', name: 'AWS EKS', category: 'compute', vendor: 'aws', description: 'Managed Kubernetes' },
  { id: 'aws-ec2', name: 'AWS EC2', category: 'compute', vendor: 'aws', description: 'Virtual servers' },
  { id: 'aws-fargate', name: 'AWS Fargate', category: 'compute', vendor: 'aws', description: 'Serverless containers' },
  { id: 'aws-apprunner', name: 'AWS App Runner', category: 'compute', vendor: 'aws', description: 'Containerized web apps' },
  { id: 'aws-beanstalk', name: 'AWS Elastic Beanstalk', category: 'compute', vendor: 'aws', description: 'PaaS for web apps' },

  // Azure Compute
  { id: 'azure-functions', name: 'Azure Functions', category: 'compute', vendor: 'azure', description: 'Serverless functions' },
  { id: 'azure-aks', name: 'Azure AKS', category: 'compute', vendor: 'azure', description: 'Managed Kubernetes' },
  { id: 'azure-app-service', name: 'Azure App Service', category: 'compute', vendor: 'azure', description: 'PaaS for web apps' },
  { id: 'azure-container-apps', name: 'Azure Container Apps', category: 'compute', vendor: 'azure', description: 'Serverless containers' },
  { id: 'azure-container-instances', name: 'Azure Container Instances', category: 'compute', vendor: 'azure', description: 'Container hosting' },
  { id: 'azure-vm', name: 'Azure Virtual Machines', category: 'compute', vendor: 'azure', description: 'Virtual servers' },

  // GCP Compute
  { id: 'gcp-functions', name: 'GCP Cloud Functions', category: 'compute', vendor: 'gcp', description: 'Serverless functions' },
  { id: 'gcp-run', name: 'GCP Cloud Run', category: 'compute', vendor: 'gcp', description: 'Serverless containers' },
  { id: 'gcp-gke', name: 'GCP GKE', category: 'compute', vendor: 'gcp', description: 'Managed Kubernetes' },
  { id: 'gcp-compute', name: 'GCP Compute Engine', category: 'compute', vendor: 'gcp', description: 'Virtual machines' },
  { id: 'gcp-appengine', name: 'GCP App Engine', category: 'compute', vendor: 'gcp', description: 'PaaS for web apps' },

  // Generic Compute
  { id: 'kubernetes', name: 'Kubernetes', category: 'compute', vendor: 'generic', description: 'Container orchestration' },
  { id: 'docker', name: 'Docker', category: 'compute', vendor: 'generic', description: 'Container platform' },

  // ===========================================
  // BACKEND (for Process nodes)
  // ===========================================

  { id: 'nodejs', name: 'Node.js', category: 'backend', vendor: 'generic', description: 'JavaScript runtime' },
  { id: 'python', name: 'Python', category: 'backend', vendor: 'generic', description: 'Python application' },
  { id: 'java', name: 'Java', category: 'backend', vendor: 'generic', description: 'Java application' },
  { id: 'dotnet', name: '.NET', category: 'backend', vendor: 'generic', description: '.NET application' },
  { id: 'go', name: 'Go', category: 'backend', vendor: 'generic', description: 'Go application' },
  { id: 'rust', name: 'Rust', category: 'backend', vendor: 'generic', description: 'Rust application' },
  { id: 'springboot', name: 'Spring Boot', category: 'backend', vendor: 'generic', description: 'Java framework' },
  { id: 'django', name: 'Django', category: 'backend', vendor: 'generic', description: 'Python web framework' },
  { id: 'fastapi', name: 'FastAPI', category: 'backend', vendor: 'generic', description: 'Python API framework' },
  { id: 'express', name: 'Express.js', category: 'backend', vendor: 'generic', description: 'Node.js framework' },
  { id: 'nestjs', name: 'NestJS', category: 'backend', vendor: 'generic', description: 'Node.js framework' },

  // ===========================================
  // MESSAGING (for Process nodes)
  // ===========================================

  { id: 'aws-sqs', name: 'AWS SQS', category: 'messaging', vendor: 'aws', description: 'Message queue service' },
  { id: 'aws-sns', name: 'AWS SNS', category: 'messaging', vendor: 'aws', description: 'Notification service' },
  { id: 'aws-eventbridge', name: 'AWS EventBridge', category: 'messaging', vendor: 'aws', description: 'Event bus' },
  { id: 'aws-kinesis', name: 'AWS Kinesis', category: 'messaging', vendor: 'aws', description: 'Data streaming' },
  { id: 'azure-servicebus', name: 'Azure Service Bus', category: 'messaging', vendor: 'azure', description: 'Message broker' },
  { id: 'azure-eventhubs', name: 'Azure Event Hubs', category: 'messaging', vendor: 'azure', description: 'Event streaming' },
  { id: 'azure-eventgrid', name: 'Azure Event Grid', category: 'messaging', vendor: 'azure', description: 'Event routing' },
  { id: 'gcp-pubsub', name: 'GCP Pub/Sub', category: 'messaging', vendor: 'gcp', description: 'Messaging service' },
  { id: 'kafka', name: 'Apache Kafka', category: 'messaging', vendor: 'generic', description: 'Event streaming platform' },
  { id: 'rabbitmq', name: 'RabbitMQ', category: 'messaging', vendor: 'generic', description: 'Message broker' },

  // ===========================================
  // NETWORKING (for TrustBoundary nodes)
  // ===========================================

  // AWS Networking
  { id: 'aws-vpc', name: 'AWS VPC', category: 'networking', vendor: 'aws', description: 'Virtual private cloud' },
  { id: 'aws-alb', name: 'AWS ALB', category: 'networking', vendor: 'aws', description: 'Application load balancer' },
  { id: 'aws-nlb', name: 'AWS NLB', category: 'networking', vendor: 'aws', description: 'Network load balancer' },
  { id: 'aws-cloudfront', name: 'AWS CloudFront', category: 'networking', vendor: 'aws', description: 'CDN' },
  { id: 'aws-api-gateway', name: 'AWS API Gateway', category: 'networking', vendor: 'aws', description: 'API management' },
  { id: 'aws-waf', name: 'AWS WAF', category: 'networking', vendor: 'aws', description: 'Web application firewall' },
  { id: 'aws-shield', name: 'AWS Shield', category: 'networking', vendor: 'aws', description: 'DDoS protection' },
  { id: 'aws-route53', name: 'AWS Route 53', category: 'networking', vendor: 'aws', description: 'DNS service' },

  // Azure Networking
  { id: 'azure-vnet', name: 'Azure Virtual Network', category: 'networking', vendor: 'azure', description: 'Virtual network' },
  { id: 'azure-appgw', name: 'Azure Application Gateway', category: 'networking', vendor: 'azure', description: 'Load balancer + WAF' },
  { id: 'azure-frontdoor', name: 'Azure Front Door', category: 'networking', vendor: 'azure', description: 'Global load balancer + CDN' },
  { id: 'azure-apim', name: 'Azure API Management', category: 'networking', vendor: 'azure', description: 'API gateway' },
  { id: 'azure-waf', name: 'Azure WAF', category: 'networking', vendor: 'azure', description: 'Web application firewall' },
  { id: 'azure-ddos', name: 'Azure DDoS Protection', category: 'networking', vendor: 'azure', description: 'DDoS protection' },
  { id: 'azure-firewall', name: 'Azure Firewall', category: 'networking', vendor: 'azure', description: 'Cloud firewall' },

  // GCP Networking
  { id: 'gcp-vpc', name: 'GCP VPC', category: 'networking', vendor: 'gcp', description: 'Virtual private cloud' },
  { id: 'gcp-lb', name: 'GCP Cloud Load Balancing', category: 'networking', vendor: 'gcp', description: 'Load balancer' },
  { id: 'gcp-cdn', name: 'GCP Cloud CDN', category: 'networking', vendor: 'gcp', description: 'Content delivery network' },
  { id: 'gcp-armor', name: 'GCP Cloud Armor', category: 'networking', vendor: 'gcp', description: 'WAF + DDoS protection' },
  { id: 'gcp-apigee', name: 'GCP Apigee', category: 'networking', vendor: 'gcp', description: 'API management' },

  // Generic Networking
  { id: 'nginx', name: 'NGINX', category: 'networking', vendor: 'generic', description: 'Web server / reverse proxy' },
  { id: 'cloudflare', name: 'Cloudflare', category: 'networking', vendor: 'generic', description: 'CDN + security' },
  { id: 'kong', name: 'Kong', category: 'networking', vendor: 'generic', description: 'API gateway' },
  { id: 'traefik', name: 'Traefik', category: 'networking', vendor: 'generic', description: 'Edge router' },

  // ===========================================
  // AUTH (for TrustBoundary nodes)
  // ===========================================

  { id: 'aws-cognito', name: 'AWS Cognito', category: 'auth', vendor: 'aws', description: 'Identity service' },
  { id: 'aws-iam', name: 'AWS IAM', category: 'auth', vendor: 'aws', description: 'Identity and access management' },
  { id: 'azure-ad', name: 'Azure Active Directory', category: 'auth', vendor: 'azure', description: 'Identity platform' },
  { id: 'azure-adb2c', name: 'Azure AD B2C', category: 'auth', vendor: 'azure', description: 'Customer identity' },
  { id: 'gcp-identity', name: 'GCP Identity Platform', category: 'auth', vendor: 'gcp', description: 'Identity service' },
  { id: 'gcp-iam', name: 'GCP IAM', category: 'auth', vendor: 'gcp', description: 'Identity and access management' },
  { id: 'auth0', name: 'Auth0', category: 'auth', vendor: 'generic', description: 'Identity platform' },
  { id: 'okta', name: 'Okta', category: 'auth', vendor: 'generic', description: 'Enterprise identity' },
  { id: 'keycloak', name: 'Keycloak', category: 'auth', vendor: 'generic', description: 'Open source IAM' },
  { id: 'oauth2', name: 'OAuth 2.0', category: 'auth', vendor: 'generic', description: 'Authorization framework' },

  // ===========================================
  // INFRASTRUCTURE (for TrustBoundary/SystemBoundary)
  // ===========================================

  { id: 'aws', name: 'AWS', category: 'infrastructure', vendor: 'aws', description: 'Amazon Web Services' },
  { id: 'azure', name: 'Microsoft Azure', category: 'infrastructure', vendor: 'azure', description: 'Azure cloud platform' },
  { id: 'gcp', name: 'Google Cloud', category: 'infrastructure', vendor: 'gcp', description: 'Google Cloud Platform' },
  { id: 'on-premise', name: 'On-Premise', category: 'infrastructure', vendor: 'generic', description: 'On-premise infrastructure' },
  { id: 'hybrid', name: 'Hybrid Cloud', category: 'infrastructure', vendor: 'generic', description: 'Hybrid cloud setup' },
  { id: 'terraform', name: 'Terraform', category: 'infrastructure', vendor: 'generic', description: 'Infrastructure as code' },

  // ===========================================
  // MONITORING
  // ===========================================

  { id: 'aws-cloudwatch', name: 'AWS CloudWatch', category: 'monitoring', vendor: 'aws', description: 'Monitoring and logging' },
  { id: 'aws-xray', name: 'AWS X-Ray', category: 'monitoring', vendor: 'aws', description: 'Distributed tracing' },
  { id: 'azure-monitor', name: 'Azure Monitor', category: 'monitoring', vendor: 'azure', description: 'Monitoring service' },
  { id: 'azure-appinsights', name: 'Azure App Insights', category: 'monitoring', vendor: 'azure', description: 'Application monitoring' },
  { id: 'gcp-monitoring', name: 'GCP Cloud Monitoring', category: 'monitoring', vendor: 'gcp', description: 'Monitoring service' },
  { id: 'gcp-logging', name: 'GCP Cloud Logging', category: 'monitoring', vendor: 'gcp', description: 'Logging service' },
  { id: 'datadog', name: 'Datadog', category: 'monitoring', vendor: 'generic', description: 'Cloud monitoring' },
  { id: 'prometheus', name: 'Prometheus', category: 'monitoring', vendor: 'generic', description: 'Metrics monitoring' },
  { id: 'grafana', name: 'Grafana', category: 'monitoring', vendor: 'generic', description: 'Observability platform' },
  { id: 'splunk', name: 'Splunk', category: 'monitoring', vendor: 'generic', description: 'Log analysis' },
]

/**
 * Search technologies by name, with optional category or categories filter
 */
export function searchTechnologies(
  query: string,
  categoryOrCategories?: TechnologyCategory | TechnologyCategory[]
): Technology[] {
  const normalizedQuery = query.toLowerCase().trim()
  const categories = categoryOrCategories
    ? Array.isArray(categoryOrCategories)
      ? categoryOrCategories
      : [categoryOrCategories]
    : null

  return TECHNOLOGIES.filter((tech) => {
    const matchesQuery =
      !normalizedQuery ||
      tech.name.toLowerCase().includes(normalizedQuery) ||
      tech.id.toLowerCase().includes(normalizedQuery) ||
      tech.description?.toLowerCase().includes(normalizedQuery)

    const matchesCategory = !categories || categories.includes(tech.category)

    return matchesQuery && matchesCategory
  })
}

/**
 * Get technologies for a specific diagram node type
 */
export function getTechnologiesForNodeType(
  nodeType: DiagramNodeType,
  query?: string
): Technology[] {
  const categories = NODE_TYPE_CATEGORIES[nodeType]
  if (!categories || categories.length === 0) return []
  return searchTechnologies(query || '', categories)
}

/**
 * Get technology by ID
 */
export function getTechnologyById(id: string): Technology | undefined {
  return TECHNOLOGIES.find((tech) => tech.id === id)
}

/**
 * Get technologies by category
 */
export function getTechnologiesByCategory(
  category: TechnologyCategory
): Technology[] {
  return TECHNOLOGIES.filter((tech) => tech.category === category)
}
