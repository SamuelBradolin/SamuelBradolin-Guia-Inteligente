-- Script SQL para criar o Gatilho (Trigger) e Função de indicação no Supabase
-- Este gatilho adiciona R$ 15,00 de saldo de desconto para quem indicou, assim que o indicado pagar sua primeira guia.

-- 1. Criação da Função de Processamento do Bônus de Indicação
CREATE OR REPLACE FUNCTION process_referral_bonus()
RETURNS TRIGGER AS $$
DECLARE
    v_referred_by VARCHAR(255);
    v_paid_guides_count INT;
BEGIN
    -- Verifica se o status foi alterado para 'pago'
    IF NEW.status = 'pago' AND (OLD.status IS NULL OR OLD.status <> 'pago') THEN
        
        -- Conta quantas guias pagas este cliente possui (incluindo esta atual)
        -- Usando COALESCE para tratar id_cliente ou client_id dependendo da nomenclatura exata de sua tabela
        SELECT COUNT(*)
        INTO v_paid_guides_count
        FROM guias
        WHERE (client_id = NEW.client_id OR id_cliente = NEW.id_cliente) AND status = 'pago';
        
        -- Se esta for a primeira guia paga deste cliente (v_paid_guides_count = 1)
        IF v_paid_guides_count = 1 THEN
            -- Obtém quem indicou este cliente na tabela 'profiles'
            SELECT referred_by
            INTO v_referred_by
            FROM profiles
            WHERE id = NEW.client_id OR id = NEW.id_cliente;
            
            -- Se existe um indicador, credita R$ 15,00 em seu discount_balance
            IF v_referred_by IS NOT NULL AND v_referred_by <> '' THEN
                UPDATE profiles
                SET discount_balance = COALESCE(discount_balance, 0) + 15.00
                WHERE id = v_referred_by OR email = v_referred_by;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Criação do Trigger associado à tabela 'guias'
DROP TRIGGER IF EXISTS trg_process_referral_bonus ON guias;
CREATE TRIGGER trg_process_referral_bonus
    AFTER UPDATE ON guias
    FOR EACH ROW
    EXECUTE FUNCTION process_referral_bonus();
