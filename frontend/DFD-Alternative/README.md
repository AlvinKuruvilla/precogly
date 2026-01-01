One of the issues I'm discovering talking to threat modeling experts is this:\
 \
 When they model a system they are looking at it at different levels - at a
process leve, and at increasingly granular levels. My original design involved
creating multiple DFDs (that's why you see a many to many association between
threat models and DFDs). But this causes duplicate threats to appear when we
move to the the threat analysis page (for example a technology component like
AWS S3 may appear in two different DFDs because the same thing is seen in two
different views of varying levels of detail of the same system).\
 \\
\
 A second issue I discovered is that DFDs sometimes struggle to capture the
complexity of a system. A data flow diagram is an extremely oversimplified model
of the systems architecture
\
 A third issue I discovered is that one of the requirements when generating
threats is to be able to discover toxic combinations (ex: "this access route and
method + that package on a server = DANGER!") and benign combinations (ex:
"this database content is not encrypted ... but it's not that important because
it just holds the marketing pages").

Another issue I'm discovering is that DFDs become quickly outdated because
system architects and software folks don't normally use them. DFDs are an
artifact of security teams. On the other hand, C4 diagrams are gaining
mainstream adoption. \
 \
 So the core insight is this: It may be easier to adapt C4 style diagrams for
threat modeling than to extend DFDs to meet the needs of complex enterprise
scenarios.\
 \

--
issues to discuss:
how to handle terminology conflict between C4 and our database schema naming (ex: TechnologyComponentsLibrary)

1. Data model design - How to store the model/views in the database
2. Migration path - How existing DFDs could convert to this model
3. Threat engine adaptation - How combination rules would work
4. UI/UX - How the editor would change (or use LikeC4 directly)

---

Zoom Metaphor - Single canvas with semantic zoom (Google Maps style)

Where does threat analysis live?

How do users define custom element kinds?
Pre-defined set (Actor, System, Container, Component) + templates for common architectures (AWS, Azure, etc.)

but what happens to process, data store, data flows and trust boundaries?

---

need ui elements for aws, nextjs etc. like in likec4
