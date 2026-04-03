-- Module 15: White-Label Theming
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS theme JSONB DEFAULT '{
  "logo_url": null,
  "plant": "olive-branch",
  "background_texture": "botanical-light",
  "colors": {
    "primary": "#5C5346",
    "secondary": "#A69F91",
    "accent": "#8B3A3A",
    "highlight": "#B8956E"
  },
  "typography": "classic"
}'::jsonb;
