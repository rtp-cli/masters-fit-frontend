import { exerciseHasDemo, extractYouTubeVideoId } from "@/lib/exercise-video";

// Regression guard for the URL-shape parser fix: the seeded catalog carries
// valid video IDs in several non-standard shapes that the old parser dropped,
// silently marking those exercises has_demo=false. Client and server share
// this logic (mirrored in backend src/utils/video-validation.ts), so it must
// recover the ID from every shape below.
describe("extractYouTubeVideoId", () => {
  const ID = "cO3lDuMXuzc";

  it.each([
    ["standard watch", `https://www.youtube.com/watch?v=${ID}`],
    ["watch with extra params", `https://www.youtube.com/watch?v=${ID}&t=30s`],
    ["youtu.be short", `https://youtu.be/${ID}`],
    ["youtu.be with share tracker", `https://youtu.be/${ID}?si=abc123`],
    ["embed", `https://www.youtube.com/embed/${ID}`],
    // Non-standard shapes present in the seed data:
    ["malformed watch/ID path", `https://youtube.com/watch/${ID}?si=abc`],
    ["shorts", `https://www.youtube.com/shorts/${ID}`],
    ["video/ID path", `https://youtube.com/video/${ID}?si=abc`],
    ["v/ID path", `https://www.youtube.com/v/${ID}`],
  ])("recovers the id from %s", (_label, url) => {
    expect(extractYouTubeVideoId(url)).toBe(ID);
  });

  it.each([
    ["a non-YouTube image url", "https://images.unsplash.com/photo-123.jpg"],
    ["an empty string", ""],
    ["a bare domain", "https://youtube.com"],
  ])("returns null for %s", (_label, url) => {
    expect(extractYouTubeVideoId(url)).toBeNull();
  });
});

describe("exerciseHasDemo", () => {
  it("honours the backend verdict when present", () => {
    const link = "https://youtube.com/watch/cO3lDuMXuzc?si=abc";
    expect(exerciseHasDemo({ link, hasDemo: false })).toBe(false);
    expect(exerciseHasDemo({ link, hasDemo: true })).toBe(true);
  });

  it("falls back to synchronous parsing when the verdict is unknown", () => {
    expect(
      exerciseHasDemo({ link: "https://youtube.com/watch/cO3lDuMXuzc?si=abc" })
    ).toBe(true);
    expect(exerciseHasDemo({ link: "https://images.unsplash.com/x.jpg" })).toBe(
      false
    );
    expect(exerciseHasDemo({ link: null })).toBe(false);
  });
});
