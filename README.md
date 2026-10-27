<div align="center">

<img src="extension/assets/WATranscribe-Texto-e-Icon.png" alt="WATranscribe" width="280" />

# WATranscribe

**Seus áudios do WhatsApp, por escrito. Sem login extra, token ou API key.**

![Versão](https://img.shields.io/badge/versão-3.0.4-00A884)
![Manifest V3](https://img.shields.io/badge/Chrome-Manifest_V3-4285F4)
[![Licença MIT](https://img.shields.io/badge/licença-MIT-yellow.svg)](LICENSE)

Por **Ariel Sousa**

</div>

## Como funciona

A extensão adiciona um botão **Transcrever** abaixo das mensagens de voz no WhatsApp Web. Clique para converter o áudio em texto, com controles para copiar, recolher ou fechar a transcrição.

- Conversas individuais e grupos, para áudios enviados e recebidos.
- Transcrição junto ao balão original, com quebra de linha para textos longos.
- Interface simples, sem configurar servidor ou credenciais.
- Processamento online pelo servidor do projeto e pela Groq, com `whisper-large-v3-turbo` em português.

A versão atual depende de internet e não oferece transcrição local/offline. O projeto usa interfaces internas do WhatsApp, que podem mudar; correções podem ser necessárias após atualizações.

## Veja funcionando

**Texto junto ao áudio:** clique em Transcrever e leia o resultado na própria conversa.

![Mensagens de voz com botão Transcrever e resultado em texto; nomes e fotos ocultados](docs/images/transcricao-na-conversa.png)

<details>
<summary>Ver a interface da extensão e o estado de transcrição</summary>

**Popup da extensão:** disponibilidade do serviço e atalho para o WhatsApp Web.

<img src="docs/images/interface-da-extensao.png" alt="Popup do WATranscribe com serviço disponível e botão Abrir WhatsApp Web" width="640" />

**Durante o processamento:** o botão informa que o áudio está sendo transcrito.

![Mensagem de voz com indicação de transcrição em andamento](docs/images/transcricao-em-andamento.png)

</details>

As capturas mostram a extensão. O userscript do Tampermonkey reutiliza os botões e a caixa de transcrição na conversa, sem o popup da extensão.

## Instalar

É necessário um navegador Chromium compatível com Manifest V3, como Chrome ou Brave, e uma sessão ativa no WhatsApp Web.

1. Baixe o repositório em **Code → Download ZIP** e extraia, ou clone:

   ```bash
   git clone https://github.com/ArielRSousa/WATranscribe.git
   ```

2. Abra `chrome://extensions` (ou `brave://extensions`).
3. Ative **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação** e selecione a pasta `extension/`.
5. Abra ou atualize o [WhatsApp Web](https://web.whatsapp.com/).

A instalação documentada aqui é manual; este repositório não fornece um link de publicação na Chrome Web Store.

## Usar pelo Tampermonkey

Você também pode usar o WATranscribe como **userscript**, sem instalar a extensão manualmente e sem esperar a publicação na loja. Ele usa o mesmo servidor, sem login adicional ou API key.

1. Instale o **Tampermonkey** pelo [site oficial](https://www.tampermonkey.net/), escolhendo a versão para seu navegador.
2. Se você já usa a extensão WATranscribe, desative-a para evitar conflitos. Mantenha apenas uma versão ativa.
3. Com o Tampermonkey instalado, abra **[Instalar WATranscribe no Tampermonkey](https://watranscribe-api.vercel.app/watranscribe.user.js)**.
4. Na tela do Tampermonkey, confira o script e clique em **Instalar**.
5. Se o navegador solicitar permissão para executar userscripts, abra `chrome://extensions` ou `brave://extensions`, entre em **Detalhes** do Tampermonkey e habilite **Permitir scripts de usuário**. Em versões anteriores, pode ser necessário ativar **Modo do desenvolvedor**. Consulte a [orientação oficial](https://www.tampermonkey.net/faq.php#Q209).
6. Abra ou atualize o [WhatsApp Web](https://web.whatsapp.com/).
7. Em uma mensagem de voz, clique em **Transcrever**. No primeiro clique da aba, leia o aviso de envio e confirme se deseja continuar.
8. Aguarde o resultado e use os controles para copiar, recolher ou fechar o texto.

**Se o link abrir somente o código:** no menu do Tampermonkey, escolha **Criar novo script**, apague o modelo e cole todo o [código do WATranscribe](https://raw.githubusercontent.com/ArielRSousa/WATranscribe/main/userscripts/watranscribe.user.js). Salve com **Ctrl+S**, confira que o script está ativado e atualize o WhatsApp Web.

**Se o botão não aparecer:** confirme que o Tampermonkey e o script estão ativos, que a execução de scripts de usuário está permitida e que a aba aberta é `https://web.whatsapp.com/`. Depois, recarregue a página.

Os limites e a política de privacidade abaixo também se aplicam ao Tampermonkey. Veja o [guia completo do userscript](userscripts/README.md) para instalação alternativa e manutenção.

## Usar

1. Abra uma conversa e encontre uma mensagem de voz.
2. Clique em **Transcrever** abaixo do áudio.
3. Aguarde o texto e use os botões para copiar, recolher ou fechar.

O popup da extensão mostra a disponibilidade do serviço e um atalho para o WhatsApp. Não é preciso criar uma conta no WATranscribe.

**Para atualizar:** substitua os arquivos da extensão, clique em **Recarregar** na página de extensões e atualize as abas do WhatsApp Web.

## Limites e disponibilidade

| Limite | Valor atual |
| --- | --- |
| Tamanho do áudio | Até 3 MB |
| Tentativas por rede/IP | 5 por minuto e 20 por dia |
| Tentativas de todo o serviço | 100 por dia |

Pessoas na mesma rede podem compartilhar a cota. As janelas de uso começam na primeira tentativa e os identificadores de rede são renovados diariamente em UTC. A disponibilidade também depende da Groq, Vercel e Redis. Quando houver limite temporário, aguarde o prazo informado antes de tentar novamente.

## Privacidade

Somente ao clicar em **Transcrever**, o áudio escolhido é enviado ao servidor hospedado na Vercel e à Groq. O código da aplicação não grava áudios nem transcrições em banco de dados. Os provedores têm suas próprias políticas de processamento e registros técnicos.

Para controlar o uso, o servidor mantém contadores temporários no Redis associados a um identificador derivado do IP. As chaves Groq permanecem no servidor, fora da extensão.

Leia a [política de privacidade](https://watranscribe-api.vercel.app/privacy.html).

## Servidor e desenvolvimento

O servidor público está em [watranscribe-api.vercel.app](https://watranscribe-api.vercel.app). Para hospedar sua própria instância, consulte o [guia do servidor](server/README.md) e o [exemplo de variáveis](server/.env.example). O endereço do servidor usado pela extensão é fixo; uma instância própria exige ajustá-lo nos arquivos da extensão e nas permissões do manifesto.

| Pasta / arquivo | Responsabilidade |
| --- | --- |
| `extension/manifest.json` | Manifesto, versão e permissões |
| `extension/content.js` e `styles.css` | Botões e transcrições nas conversas |
| `extension/injected.js` | Localização da mensagem e obtenção do áudio |
| `extension/background.js` e `offscreen.js` | Encaminhamento da transcrição ao servidor |
| `extension/popup.html`, `popup.js` e `popup.css` | Interface da extensão |
| `server/api/` | Disponibilidade e transcrição |
| `server/lib/service.js` | Integração Groq e limites no Redis |
| `server/public/` | Página pública e política de privacidade |
| `tests/` | Testes automatizados com cenários simulados |

Com Node.js 22, execute na raiz:

```bash
node --test tests/*.test.*
```

Os testes cobrem interface, localização de mensagens de grupos, posicionamento dos controles e tratamento de erros da API. São testes com simulações; não substituem a validação de uma transcrição real no WhatsApp.

## Solução de problemas

- **Botão ausente ou layout antigo:** recarregue a extensão e atualize a aba do WhatsApp.
- **Mensagem não encontrada:** atualize para a versão mais recente, reabra a conversa e tente novamente.
- **Serviço indisponível:** tente novamente mais tarde. Na hospedagem própria, confira as variáveis da Vercel e a conexão Redis.
- **Áudio muito grande:** use um áudio de até 3 MB.

## Contribuir

Abra uma [issue](https://github.com/ArielRSousa/WATranscribe/issues) com a versão da extensão, o comportamento observado e os passos para reproduzir. Ao compartilhar capturas, oculte mensagens e dados pessoais. Pull requests são bem-vindos.

Projeto independente, sem vínculo oficial com WhatsApp ou Meta. Licenciado sob a [MIT](LICENSE).
