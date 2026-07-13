-- Script SQL de Migração e Criação do Gatilho (Trigger) no Supabase
-- Este arquivo cria as colunas necessárias na tabela 'profiles' e configura o gatilho automático de indicação.

-- 1. CRIAÇÃO DAS COLUNAS NECESSÁRIAS NA TABELA 'profiles'
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS referred_by TEXT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS discount_balance NUMERIC DEFAULT 0.00;


-- 2. CRIAÇÃO DA FUNÇÃO DE PROCESSAMENTO DO BÔNUS DE INDICAÇÃO
CREATE OR REPLACE FUNCTION process_referral_bonus()
RETURNS TRIGGER AS $$
DECLARE
    v_referred_by VARCHAR(255);
    v_paid_guides_count INT;
BEGIN
    -- Verifica se o status da guia mudou para 'pago'
    IF NEW.status = 'pago' AND (OLD.status IS NULL OR OLD.status <> 'pago') THEN
        
        -- Conta quantas guias pagas este cliente possui (incluindo esta atual)
        SELECT COUNT(*)
        INTO v_paid_guides_count
        FROM guias
        WHERE (client_id = NEW.client_id OR id_cliente = NEW.id_cliente) AND status = 'pago';
        
        -- Se esta for a primeira guia paga deste cliente (v_paid_guides_count = 1), processa o prêmio
        IF v_paid_guides_count = 1 THEN
            -- Localiza quem indicou este cliente na tabela 'profiles'
            SELECT referred_by
            INTO v_referred_by
            FROM profiles
            WHERE id = NEW.client_id OR id = NEW.id_cliente;
            
            -- Se existir um indicador, credita R$ 15,00 em seu saldo de descontos (discount_balance)
            IF v_referred_by IS NOT NULL AND v_referred_by <> '' THEN
                -- Atualiza adicionando R$ 15.00 ao saldo do usuário que fez a indicação
                -- Pode identificar por username (slug) ou ID conforme a lógica de cadastro
                UPDATE profiles
                SET discount_balance = COALESCE(discount_balance, 0) + 15.00
                WHERE id = v_referred_by 
                   OR email = v_referred_by 
                   OR LOWER(name) = LOWER(v_referred_by)
                   -- Também resolve por usernames/slugs derivados se criados
                   OR LOWER(REPLACE(REPLACE(name, ' ', ''), 'á', 'a')) = LOWER(REPLACE(v_referred_by, '123', ''));
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. CRIAÇÃO DO TRIGGER ASSOCIADO À TABELA 'guias'
DROP TRIGGER IF EXISTS trg_process_referral_bonus ON guias;
CREATE TRIGGER trg_process_referral_bonus
    AFTER UPDATE ON guias
    FOR EACH ROW
    EXECUTE FUNCTION process_referral_bonus();
