# Systema login design

The login and registration pages retain Systema's navy (`#142b3d`), orange (`#b85319`), Segoe UI font stack, logo, routes, custom controls, and existing authentication flow. The former centered card is replaced by a coastal image and a spacious form panel. On phones, the image becomes a short banner so the sign-in button remains easy to reach.

Design direction: a calm, premium travel workspace. Design variance 6, motion intensity 5, visual density 3. This uses the existing React and Tailwind foundation with scoped CSS. Entry animations reveal the image, heading, and form in sequence; button movement provides interaction feedback. All motion is disabled under reduced-motion preferences. The login surface follows the system's light or dark preference.

## Artwork

Generated with the built-in imagegen tool. The scene is illustrative and inspired by Palawan, rather than documentary photography of a specific bookable destination.

- Desktop asset: `public/images/systema-coast.webp` (1122 × 1402, approximately 316 KB).
- Phone asset: `public/images/systema-coast-mobile.webp` (800 × 400, approximately 77 KB).
- The original generated PNG remains in the user's Codex generated-images directory.

Final generation prompt:

> Use case: photorealistic-natural. Asset type: scenic background photograph for the Systema travel-agency login page. Create an exceptionally beautiful aerial coastal scene inspired by the limestone islands of Palawan, Philippines, viewed from a high drone angle. A graceful arc of pale sand curves from the lower left around rich turquoise water into dramatic green limestone cliffs on the upper right; open deep teal water fills the lower right. One tiny white traditional outrigger boat in the cove for scale. Soft warm morning light, lush natural greens, detailed ripples in clear water, cinematic editorial travel photography, realistic and sophisticated, not oversaturated. Portrait 4:5 composition with strong image depth; must also crop attractively to a short wide banner. Natural scene only, no typography, no labels, no graphics, no border, no logo or watermark. Generate the image and return its saved local file path so it can be used as a website asset.

## Verification

Browser checks cover desktop and 375-pixel phone layouts, image loading, no horizontal overflow, sign-in visibility, incorrect-password feedback, successful sign-in, and navigation to registration with all original fields. The dark and reduced-motion CSS branches were rendered in an isolated local preview; the normal preference-driven source was restored before publishing. Existing application tests and the production build pass.
