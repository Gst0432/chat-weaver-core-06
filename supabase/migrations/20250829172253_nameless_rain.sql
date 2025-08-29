/*
  # Suppression complète des tables et politiques conflictuelles

  1. Suppression des tables
    - Supprime toutes les tables de l'application dans l'ordre correct (foreign keys)
    - Supprime les types enum personnalisés
    - Supprime les fonctions et triggers

  2. Nettoyage complet
    - Supprime toutes les policies RLS
    - Supprime tous les triggers
    - Supprime toutes les fonctions personnalisées
    - Repart sur une base propre
*/

-- Désactiver temporairement les contraintes de clés étrangères
SET session_replication_role = replica;

-- Supprimer toutes les tables dans l'ordre inverse des dépendances
DROP TABLE IF EXISTS document_conversations CASCADE;
DROP TABLE IF EXISTS document_chunks CASCADE;
DROP TABLE IF EXISTS document_operations CASCADE;
DROP TABLE IF EXISTS documents CASCADE;

DROP TABLE IF EXISTS youtube_translations CASCADE;
DROP TABLE IF EXISTS youtube_transcriptions CASCADE;
DROP TABLE IF EXISTS youtube_videos CASCADE;

DROP TABLE IF EXISTS translation_sessions CASCADE;
DROP TABLE IF EXISTS transcriptions CASCADE;
DROP TABLE IF EXISTS audio_recordings CASCADE;

DROP TABLE IF EXISTS tts_history CASCADE;
DROP TABLE IF EXISTS video_history CASCADE;
DROP TABLE IF EXISTS generated_videos CASCADE;

DROP TABLE IF EXISTS ebook_chapters CASCADE;
DROP TABLE IF EXISTS ebook_generations CASCADE;
DROP TABLE IF EXISTS ebooks CASCADE;

DROP TABLE IF EXISTS embeddings CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

DROP TABLE IF EXISTS team_invitations CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

DROP TABLE IF EXISTS minute_purchases CASCADE;
DROP TABLE IF EXISTS subscribers CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS saas_templates CASCADE;
DROP TABLE IF EXISTS generated_apps CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;
DROP TABLE IF EXISTS admin_logs CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;

-- Supprimer les types enum personnalisés
DROP TYPE IF EXISTS app_role CASCADE;

-- Supprimer les fonctions personnalisées
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_trigger() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS enforce_team_member_limit() CASCADE;
DROP FUNCTION IF EXISTS add_owner_to_team() CASCADE;
DROP FUNCTION IF EXISTS is_team_owner(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS is_team_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS has_role(uuid, app_role) CASCADE;
DROP FUNCTION IF EXISTS is_super_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS log_team_activity(text, text, uuid, text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS check_free_generation_quota(text) CASCADE;
DROP FUNCTION IF EXISTS increment_free_generation(text) CASCADE;
DROP FUNCTION IF EXISTS check_generation_limits(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_partial_ebook_content(uuid) CASCADE;
DROP FUNCTION IF EXISTS match_embeddings(uuid, integer, vector) CASCADE;
DROP FUNCTION IF EXISTS search_document_chunks(uuid, vector, real, integer) CASCADE;

-- Réactiver les contraintes de clés étrangères
SET session_replication_role = DEFAULT;

-- Nettoyer les extensions si nécessaire (optionnel)
-- DROP EXTENSION IF EXISTS vector CASCADE;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE 'Toutes les tables et politiques conflictuelles ont été supprimées avec succès.';
  RAISE NOTICE 'Vous pouvez maintenant exécuter les nouvelles migrations.';
END $$;