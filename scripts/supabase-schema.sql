-- ============================================
-- SCHEMA SUPABASE POUR MEDFLASH
-- ============================================
-- Ce script crée la table user_data pour stocker
-- les données utilisateur (decks, cards, reviews, etc.)
-- ============================================

-- 1. Créer la table user_data
CREATE TABLE IF NOT EXISTS user_data (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id)
);

-- 2. Créer un index sur user_id pour des recherches rapides
CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON user_data(user_id);

-- 3. Activer Row Level Security (RLS)
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- 4. Politique : Les utilisateurs ne peuvent voir que leurs propres données
CREATE POLICY "Users can view their own data"
  ON user_data
  FOR SELECT
  USING (auth.uid() = user_id);

-- 5. Politique : Les utilisateurs peuvent insérer leurs propres données
CREATE POLICY "Users can insert their own data"
  ON user_data
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 6. Politique : Les utilisateurs peuvent mettre à jour leurs propres données
CREATE POLICY "Users can update their own data"
  ON user_data
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. Politique : Les utilisateurs peuvent supprimer leurs propres données
CREATE POLICY "Users can delete their own data"
  ON user_data
  FOR DELETE
  USING (auth.uid() = user_id);

-- 8. Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_user_data_updated_at
  BEFORE UPDATE ON user_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- EXPLICATIONS :
-- ============================================
-- 
-- 1. TABLE user_data :
--    - user_id : référence vers auth.users (utilisateur Supabase)
--    - data : JSON qui contient tous les decks, cards, reviews, etc.
--    - created_at / updated_at : timestamps pour tracer les modifications
--
-- 2. ROW LEVEL SECURITY (RLS) :
--    - Chaque utilisateur ne peut voir/modifier que SES propres données
--    - Même si un utilisateur malveillant obtient l'API key, il ne peut pas
--      accéder aux données des autres utilisateurs
--
-- 3. POLICIES :
--    - SELECT : Un utilisateur peut lire ses données
--    - INSERT : Un utilisateur peut créer ses données
--    - UPDATE : Un utilisateur peut modifier ses données
--    - DELETE : Un utilisateur peut supprimer ses données
--
-- 4. TRIGGER :
--    - Met à jour automatiquement le champ updated_at à chaque modification
--    - Utile pour tracer les dernières modifications et résoudre les conflits
--
-- ============================================
-- COMMENT UTILISER :
-- ============================================
-- 
-- 1. Va dans Supabase Dashboard > SQL Editor
-- 2. Copie-colle tout ce fichier
-- 3. Clique sur "Run" (ou Ctrl/Cmd + Enter)
-- 4. Tu devrais voir "Success. No rows returned"
-- 5. Va dans Table Editor : tu verras la nouvelle table "user_data"
-- 6. C'est tout ! 🎉
--
-- ============================================

