## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `username` | `text` |  Nullable Unique |
| `display_name` | `text` |  Nullable |
| `avatar_url` | `text` |  Nullable |
| `bio` | `text` |  Nullable |
| `plan` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `last_login` | `timestamptz` |  Nullable |
| `last_generation_at` | `timestamptz` |  Nullable |
| `plan_expires_at` | `timestamptz` |  Nullable |
| `flex_type` | `text` |  Nullable |

## Table `social_connections`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Nullable |
| `platform` | `text` |  |
| `access_token` | `text` |  Nullable |
| `refresh_token` | `text` |  Nullable |
| `token_expires_at` | `timestamptz` |  Nullable |
| `platform_user_id` | `text` |  Nullable |
| `platform_username` | `text` |  Nullable |
| `raw_data` | `jsonb` |  Nullable |
| `last_synced_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `veredits`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Nullable |
| `mode` | `text` |  |
| `card_image_url` | `text` |  Nullable |
| `veredict_text` | `text` |  Nullable |
| `veredict_badge` | `text` |  Nullable |
| `tags` | `jsonb` |  Nullable |
| `niche` | `text` |  Nullable |
| `niche_colors` | `jsonb` |  Nullable |
| `music_track` | `jsonb` |  Nullable |
| `political_stance` | `jsonb` |  Nullable |
| `sensitive_topics` | `jsonb` |  Nullable |
| `is_public` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `frame_type` | `text` |  Nullable |
| `base_image_url` | `text` |  Nullable |
| `is_custom_upload` | `bool` |  Nullable |
| `visible_fields` | `jsonb` |  Nullable |
| `final_opinion` | `text` |  Nullable |
| `network_highlights` | `jsonb` |  Nullable |
| `user_name` | `text` |  Nullable |

## Table `payments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Nullable |
| `amount` | `numeric` |  Nullable |
| `type` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `mercado_pago_id` | `text` |  Nullable |
| `plan` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `provider` | `text` |  Nullable |

## Table `challenges`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Nullable |
| `challenge_text` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `completed_at` | `timestamptz` |  Nullable |

## Table `chat_sessions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Nullable |
| `mode` | `text` |  |
| `messages` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `phase` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `phase_data` | `jsonb` |  Nullable |
| `scanned_data` | `jsonb` |  Nullable |

