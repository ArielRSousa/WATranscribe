# WATranscribe no Tampermonkey

Alternativa à extensão enquanto a publicação na Chrome Web Store está em análise. Não exige API key ou login adicional e usa o mesmo servidor público, com os mesmos limites.

## Instalar no Chrome ou Brave

Instale o Tampermonkey pelo [site oficial](https://www.tampermonkey.net/), que oferece o link para a loja do navegador.

Você pode instalar diretamente pelo [arquivo publicado](https://watranscribe-api.vercel.app/watranscribe.user.js). Se o navegador mostrar apenas o código, siga a instalação manual abaixo.

1. Abra o painel do Tampermonkey e escolha **Criar novo script**.
2. Apague o modelo inicial e cole todo o conteúdo de [`watranscribe.user.js`](watranscribe.user.js).
3. Salve com **Ctrl+S** e confirme que o script está ativado.
4. Se o navegador solicitar, habilite **Permitir scripts de usuário** nas configurações do Tampermonkey em `chrome://extensions` ou `brave://extensions`. Em versões anteriores, pode ser necessário o modo do desenvolvedor.
5. Desative a extensão WATranscribe instalada manualmente para usar apenas uma versão e evitar conflitos.
6. Atualize o WhatsApp Web e clique em **Transcrever** abaixo de um áudio. O primeiro clique por aba mostra o aviso de envio e pede autorização.

O arquivo também pode ser importado pela opção de importar arquivo do Tampermonkey. Nenhum cadastro de chave é necessário.

## Privacidade e limitações

Somente os áudios solicitados são enviados ao servidor do projeto e à Groq. Até 3 MB por áudio, 5 tentativas/minuto e 20/dia por rede, e 100 tentativas/dia compartilhadas. Consulte a [política de privacidade](https://watranscribe-api.vercel.app/privacy.html).

O script usa APIs internas do WhatsApp, sujeitas a mudanças. Testes locais simulam o envio e seus erros; a instalação e uma transcrição real no Tampermonkey ainda precisam ser validadas no navegador. O userscript não depende da aprovação da extensão, e não equivale a uma extensão aprovada pela loja.

## Gerar novamente

Na raiz do projeto:

```bash
node scripts/build-userscript.mjs
node --test tests/*.test.*
```

O gerador combina a obtenção do áudio e componentes da interface da extensão com `runtime.js`. Ele gera o arquivo instalável e uma cópia estática em `server/public/`. Não edite o arquivo gerado diretamente.
