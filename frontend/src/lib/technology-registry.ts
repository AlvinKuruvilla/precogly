export interface Technology {
  id: string
  name: string
  category: TechnologyCategory
  description?: string
  icon?: string
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
  | 'other'

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
  other: { label: 'Other', color: '#475569' },
}

// Common technology registry
export const TECHNOLOGIES: Technology[] = [
  // Databases
  { id: 'postgresql', name: 'PostgreSQL', category: 'database', description: 'Open source relational database' },
  { id: 'mysql', name: 'MySQL', category: 'database', description: 'Popular open source SQL database' },
  { id: 'mongodb', name: 'MongoDB', category: 'database', description: 'NoSQL document database' },
  { id: 'redis', name: 'Redis', category: 'database', description: 'In-memory data structure store' },
  { id: 'dynamodb', name: 'DynamoDB', category: 'database', description: 'AWS managed NoSQL database' },
  { id: 'elasticsearch', name: 'Elasticsearch', category: 'database', description: 'Distributed search and analytics engine' },
  { id: 'cassandra', name: 'Cassandra', category: 'database', description: 'Distributed NoSQL database' },
  { id: 'mssql', name: 'SQL Server', category: 'database', description: 'Microsoft relational database' },
  { id: 'oracle', name: 'Oracle DB', category: 'database', description: 'Enterprise relational database' },
  { id: 'sqlite', name: 'SQLite', category: 'database', description: 'Embedded relational database' },

  // Backend
  { id: 'nodejs', name: 'Node.js', category: 'backend', description: 'JavaScript runtime for server-side' },
  { id: 'python', name: 'Python', category: 'backend', description: 'General purpose programming language' },
  { id: 'django', name: 'Django', category: 'backend', description: 'Python web framework' },
  { id: 'flask', name: 'Flask', category: 'backend', description: 'Lightweight Python web framework' },
  { id: 'fastapi', name: 'FastAPI', category: 'backend', description: 'Modern Python web framework' },
  { id: 'express', name: 'Express.js', category: 'backend', description: 'Node.js web framework' },
  { id: 'nestjs', name: 'NestJS', category: 'backend', description: 'Progressive Node.js framework' },
  { id: 'springboot', name: 'Spring Boot', category: 'backend', description: 'Java-based framework' },
  { id: 'dotnet', name: '.NET', category: 'backend', description: 'Microsoft development platform' },
  { id: 'go', name: 'Go', category: 'backend', description: 'Compiled programming language' },
  { id: 'rust', name: 'Rust', category: 'backend', description: 'Systems programming language' },
  { id: 'ruby', name: 'Ruby on Rails', category: 'backend', description: 'Ruby web framework' },
  { id: 'graphql', name: 'GraphQL', category: 'backend', description: 'API query language' },
  { id: 'grpc', name: 'gRPC', category: 'backend', description: 'High-performance RPC framework' },

  // Frontend
  { id: 'react', name: 'React', category: 'frontend', description: 'JavaScript UI library' },
  { id: 'nextjs', name: 'Next.js', category: 'frontend', description: 'React framework for production' },
  { id: 'vue', name: 'Vue.js', category: 'frontend', description: 'Progressive JavaScript framework' },
  { id: 'angular', name: 'Angular', category: 'frontend', description: 'TypeScript web framework' },
  { id: 'svelte', name: 'Svelte', category: 'frontend', description: 'Compiled JavaScript framework' },
  { id: 'typescript', name: 'TypeScript', category: 'frontend', description: 'Typed JavaScript superset' },

  // Infrastructure
  { id: 'aws', name: 'AWS', category: 'infrastructure', description: 'Amazon Web Services' },
  { id: 'gcp', name: 'Google Cloud', category: 'infrastructure', description: 'Google Cloud Platform' },
  { id: 'azure', name: 'Azure', category: 'infrastructure', description: 'Microsoft Azure cloud' },
  { id: 'kubernetes', name: 'Kubernetes', category: 'infrastructure', description: 'Container orchestration' },
  { id: 'docker', name: 'Docker', category: 'infrastructure', description: 'Container platform' },
  { id: 'terraform', name: 'Terraform', category: 'infrastructure', description: 'Infrastructure as code' },
  { id: 'nginx', name: 'NGINX', category: 'infrastructure', description: 'Web server and reverse proxy' },
  { id: 'cloudflare', name: 'Cloudflare', category: 'infrastructure', description: 'CDN and security platform' },
  { id: 'lambda', name: 'AWS Lambda', category: 'infrastructure', description: 'Serverless compute' },
  { id: 'ec2', name: 'AWS EC2', category: 'infrastructure', description: 'Virtual cloud servers' },
  { id: 'ecs', name: 'AWS ECS', category: 'infrastructure', description: 'Container orchestration on AWS' },
  { id: 's3', name: 'AWS S3', category: 'infrastructure', description: 'Object storage service' },
  { id: 'vpc', name: 'AWS VPC', category: 'infrastructure', description: 'Virtual private cloud' },
  { id: 'alb', name: 'AWS ALB', category: 'infrastructure', description: 'Application load balancer' },
  { id: 'api-gateway', name: 'API Gateway', category: 'infrastructure', description: 'AWS API management' },

  // Messaging
  { id: 'kafka', name: 'Apache Kafka', category: 'messaging', description: 'Distributed event streaming' },
  { id: 'rabbitmq', name: 'RabbitMQ', category: 'messaging', description: 'Message broker' },
  { id: 'sqs', name: 'AWS SQS', category: 'messaging', description: 'Simple Queue Service' },
  { id: 'sns', name: 'AWS SNS', category: 'messaging', description: 'Simple Notification Service' },
  { id: 'pubsub', name: 'Google Pub/Sub', category: 'messaging', description: 'GCP messaging service' },
  { id: 'eventbridge', name: 'EventBridge', category: 'messaging', description: 'AWS event bus' },

  // Cache
  { id: 'memcached', name: 'Memcached', category: 'cache', description: 'Distributed memory caching' },
  { id: 'elasticache', name: 'ElastiCache', category: 'cache', description: 'AWS managed caching' },
  { id: 'cloudfront', name: 'CloudFront', category: 'cache', description: 'AWS CDN' },
  { id: 'varnish', name: 'Varnish', category: 'cache', description: 'HTTP accelerator' },

  // Storage
  { id: 'gcs', name: 'Google Cloud Storage', category: 'storage', description: 'GCP object storage' },
  { id: 'azure-blob', name: 'Azure Blob Storage', category: 'storage', description: 'Azure object storage' },
  { id: 'efs', name: 'AWS EFS', category: 'storage', description: 'Elastic file system' },

  // Auth
  { id: 'oauth2', name: 'OAuth 2.0', category: 'auth', description: 'Authorization framework' },
  { id: 'oidc', name: 'OpenID Connect', category: 'auth', description: 'Identity layer on OAuth' },
  { id: 'saml', name: 'SAML', category: 'auth', description: 'Security Assertion Markup Language' },
  { id: 'jwt', name: 'JWT', category: 'auth', description: 'JSON Web Tokens' },
  { id: 'cognito', name: 'AWS Cognito', category: 'auth', description: 'AWS identity service' },
  { id: 'auth0', name: 'Auth0', category: 'auth', description: 'Identity platform' },
  { id: 'okta', name: 'Okta', category: 'auth', description: 'Enterprise identity' },
  { id: 'keycloak', name: 'Keycloak', category: 'auth', description: 'Open source IAM' },
  { id: 'ldap', name: 'LDAP', category: 'auth', description: 'Directory protocol' },
  { id: 'active-directory', name: 'Active Directory', category: 'auth', description: 'Microsoft directory' },

  // Monitoring
  { id: 'prometheus', name: 'Prometheus', category: 'monitoring', description: 'Metrics monitoring' },
  { id: 'grafana', name: 'Grafana', category: 'monitoring', description: 'Observability platform' },
  { id: 'datadog', name: 'Datadog', category: 'monitoring', description: 'Cloud monitoring' },
  { id: 'newrelic', name: 'New Relic', category: 'monitoring', description: 'Observability platform' },
  { id: 'splunk', name: 'Splunk', category: 'monitoring', description: 'Log analysis' },
  { id: 'cloudwatch', name: 'CloudWatch', category: 'monitoring', description: 'AWS monitoring' },
  { id: 'sentry', name: 'Sentry', category: 'monitoring', description: 'Error tracking' },
  { id: 'jaeger', name: 'Jaeger', category: 'monitoring', description: 'Distributed tracing' },
]

/**
 * Search technologies by name or category
 */
export function searchTechnologies(
  query: string,
  category?: TechnologyCategory
): Technology[] {
  const normalizedQuery = query.toLowerCase().trim()

  return TECHNOLOGIES.filter((tech) => {
    const matchesQuery =
      !normalizedQuery ||
      tech.name.toLowerCase().includes(normalizedQuery) ||
      tech.id.toLowerCase().includes(normalizedQuery) ||
      tech.description?.toLowerCase().includes(normalizedQuery)

    const matchesCategory = !category || tech.category === category

    return matchesQuery && matchesCategory
  })
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
