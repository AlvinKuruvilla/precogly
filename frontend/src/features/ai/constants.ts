/**
 * Where a user goes to make AI work.
 *
 * Every AI affordance needs this: the honest response to "AI isn't set up" is
 * to take the user to the place they can set it up, not to grey the control out
 * and leave them guessing. Keeping the path here means an affordance can route
 * there without its caller having to know about provider configuration at all.
 */
export const AI_PROVIDER_SETTINGS_PATH = '/settings/ai-providers'
