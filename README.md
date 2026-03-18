# Precogly

## The open-source alternative to commercial threat modeling platforms

### Quick Start

```bash
  git clone https://github.com/precogly/precogly.git
  cd precogly
  docker compose up --build
```

Open http://localhost:5173 and log in with admin@precogly.dev / admin123.

### Why Precogly?

Open-source threat modeling tools lack enterprise features. Commercial tools come with heavy price tags and vendor lock-in.

Precogly bridges this gap and democratizes threat modeling for every org in the world.

### Key Features

- Import and export TM-BOM style JSON files - improves interoperability with other threat modeling platforms
- A threat modeling workspace allows for team collaboration
- An advanced DFD editor (allows for nested components, trust zones with trust boundaries and much more)
- Community library packs with links to taxonomies like MITRE ATT&CK, CAPEC, LINDDUN, STRIDE etc. - allows your team to quickly create high quality threat models

### Who is Precogly for?

- **Security architects** looking to scale threat modeling in their orgs.
- **Vibe coding security engineers** who need a well-architected CRUD foundation on which they can build their AI threat modeling assistants.
- **Threat modeling consultants and trainers** looking for a platform that supports reference images, team collaboration, and structured threat modeling programs.
- **Compliance professionals** looking to link threat modeling with security requirements coming from standards like ASVS or laws like CRA and DORA

Precogly is designed for enterprise workflows, but smaller organizations can also find value in the DFD editor, library packs, and collaborative workspace.

### Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS, shadcn/ui, React Flow
- **Backend:** Django 5.1, Django REST Framework, PostgreSQL 16
- **Infrastructure:** Docker, nginx (production)

### Contributing

- [Open an issue](https://github.com/precogly/precogly/issues)
- Contribute a library pack
- Contribute to the codebase

If you find Precogly useful, give the project a star!

### License

Apache 2.0
