import VirtueModel from "@/models/Virtue";
export { isoWeekNumber, weekStartDate, currentVirtueOrder } from "@/lib/virtue-dates";

const VIRTUES = [
  { name: "Disciplined",     slug: "disciplined",    tagline: "A good man masters himself",                                order: 1  },
  { name: "Present",         slug: "present",        tagline: "A good man is fully where he is",                          order: 2  },
  { name: "Patient",         slug: "patient",        tagline: "A good man endures without complaint",                      order: 3  },
  { name: "Humble",          slug: "humble",         tagline: "A good man knows what he doesn't know",                    order: 4  },
  { name: "Honest",          slug: "honest",         tagline: "A good man is true with himself first",                    order: 5  },
  { name: "Courageous",      slug: "courageous",     tagline: "A good man acts despite fear",                             order: 6  },
  { name: "Genuine",         slug: "genuine",        tagline: "A good man has nothing to hide",                           order: 7  },
  { name: "Responsible",     slug: "responsible",    tagline: "A good man owns his outcomes",                             order: 8  },
  { name: "Provider",        slug: "provider",       tagline: "A good man provides presence, safety, and stability",     order: 9  },
  { name: "Strong",          slug: "strong",         tagline: "A good man is strong in body, mind, and spirit",          order: 10 },
  { name: "Intentional",     slug: "intentional",    tagline: "A good man chooses deliberately",                          order: 11 },
  { name: "Faithful",        slug: "faithful",       tagline: "A good man keeps his word",                               order: 12 },
  { name: "Servant Leader",  slug: "servant-leader", tagline: "A good man leads by example and sacrifice",               order: 13 },
] as const;

export const VIRTUE_SLUGS = VIRTUES.map((v) => v.slug);

// Idempotent — upserts the 13 canonical virtues, deactivates any removed ones
export async function ensureVirtues() {
  await VirtueModel.bulkWrite(
    VIRTUES.map((v) => ({
      updateOne: {
        filter: { slug: v.slug },
        update: {
          $setOnInsert: { essay: "", etymology: "", isActive: true },
          $set: {
            name: v.name,
            tagline: v.tagline,
            displayName: v.slug === "servant-leader"
              ? "A Good Man Is a Servant Leader"
              : `A Good Man Is ${v.name}`,
            order: v.order,
          },
        },
        upsert: true,
      },
    }))
  );

  // Deactivate any legacy virtues that are no longer in the canonical list
  await VirtueModel.updateMany(
    { slug: { $nin: VIRTUE_SLUGS } },
    { $set: { isActive: false } }
  );
}
