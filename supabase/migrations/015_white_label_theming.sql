-- Module 15: White-Label Theming
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS theme JSONB DEFAULT '{
  "logo_url": null,
  "plant": "olive-branch",
  "background_texture": "botanical-light",
  "colors": {
    "primary": "#6E6960",
    "secondary": "#F1EFE0",
    "accent": "#440606",
    "highlight": "#C4AB70"
  },
  "typography": "classic"
}'::jsonb;
