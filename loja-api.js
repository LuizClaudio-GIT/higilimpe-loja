/* HigiLimpe — camada de dados da loja (produção, Supabase).
   Mantém exatamente a interface window.HigiLimpeAPI esperada pelo protótipo. */
(function () {
  var SUPABASE_URL = 'https://wlvkvwjqpjqetkyherwe.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_QxvYhjMSbKsQD17cKotnUA_bPGbVf9Q';
  var _clientPromise = null;

  function getClient() {
    if (!_clientPromise) {
      _clientPromise = import('https://esm.sh/@supabase/supabase-js@2').then(function (m) {
        return m.createClient(SUPABASE_URL, SUPABASE_KEY);
      });
    }
    return _clientPromise;
  }

  function nomeDe(u) {
    return (u && u.user_metadata && u.user_metadata.nome) || (u && u.email) || '';
  }

  window.HigiLimpeAPI = {
    modo: 'nuvem',

    carregarCatalogo: function () {
      return getClient().then(function (sb) {
        return sb.from('loja').select('dados').eq('id', 1).maybeSingle();
      }).then(function (r) {
        return (r && r.data && r.data.dados) ? r.data.dados : null;
      }).catch(function () { return null; });
    },

    sessaoAtual: function () {
      return getClient().then(function (sb) {
        return sb.auth.getSession();
      }).then(function (r) {
        var u = r && r.data && r.data.session && r.data.session.user;
        if (!u) return null;
        return { email: u.email, nome: nomeDe(u) };
      }).catch(function () { return null; });
    },

    entrar: function (email, senha) {
      return getClient().then(function (sb) {
        return sb.auth.signInWithPassword({ email: String(email || '').trim(), password: senha });
      }).then(function (r) {
        if (r.error || !r.data || !r.data.user) throw new Error('E-mail ou senha incorretos.');
        var u = r.data.user;
        return { email: u.email, nome: nomeDe(u) };
      });
    },

    sair: function () {
      return getClient().then(function (sb) { return sb.auth.signOut(); }).then(function () {});
    },

    salvarCatalogo: function (dados) {
      return getClient().then(function (sb) {
        return sb.from('loja')
          .update({ dados: dados, atualizado: new Date().toISOString() })
          .eq('id', 1)
          .select('atualizado')
          .maybeSingle();
      }).then(function (r) {
        if (r.error) throw new Error('Erro ao salvar.');
        return { atualizado: (r.data && r.data.atualizado) || new Date().toISOString() };
      });
    },

    enviarFoto: function (blob, idProduto) {
      return getClient().then(function (sb) {
        var ext = (blob.type && blob.type.indexOf('png') > -1) ? 'png' : 'jpg';
        var path = (idProduto || 'produto') + '-' + Date.now() + '.' + ext;
        return sb.storage.from('fotos').upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true })
          .then(function (r) {
            if (r.error) throw new Error('Erro ao enviar foto.');
            var pub = sb.storage.from('fotos').getPublicUrl(path);
            return pub.data.publicUrl;
          });
      });
    },

    descartarRascunho: function () { return Promise.resolve(); }
  };
})();
