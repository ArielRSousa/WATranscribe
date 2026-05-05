<div align="center">

<img src="extension/assets/WATranscribe-Texto-e-Icon.png" alt="WATranscribe — transcrição de áudios do WhatsApp Web com Whisper local" width="420" />


[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Whisper](https://img.shields.io/badge/Whisper-local-00A884?logo=openai&logoColor=white)](https://github.com/openai/whisper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)](https://github.com)

**Transcreva mensagens de voz do WhatsApp Web com Groq ou Whisper local no navegador.**

*Por **Ariel Sousa** — feedbacks, ideias e contribuições são muito bem-vindos.*

</div>

---

## <img src="https://cdn.simpleicons.org/googlechrome/4285F4" width="16" alt="Chrome icon" /> O que é

**WATranscribe** é uma extensão para o Google Chrome que adiciona um botão **Transcrever** nas mensagens de áudio do [WhatsApp Web](https://web.whatsapp.com/). O áudio é obtido via APIs internas do WhatsApp (no contexto da página) e a transcrição roda em um documento **offscreen** com **Whisper** via **WebAssembly** (`@xenova/transformers`).

## <img src="https://cdn.simpleicons.org/checkmarx/00A884" width="16" alt="Checklist icon" /> Requisitos

- Google Chrome (ou outro navegador compatível com extensões **Manifest V3**)
- Conta e sessão ativa no **WhatsApp Web**
- Conexão com a internet na **primeira** execução de cada modelo (download e cache dos pesos no navegador)

## <img src="https://cdn.simpleicons.org/googlechrome/4285F4" width="16" alt="Install icon" /> Como instalar (modo desenvolvedor)

1. Abra `chrome://extensions`
2. Ative **Modo do desenvolvedor**
3. Clique em **Carregar sem compactação**
4. Selecione a pasta `extension/` deste repositório

## <img src="https://cdn.simpleicons.org/whatsapp/25D366" width="16" alt="WhatsApp icon" /> Como usar

1. Abra [web.whatsapp.com](https://web.whatsapp.com/)
2. Clique no ícone da extensão e escolha o provedor:
   - **Groq:** cole sua `GROQ_API_KEY` para transcrever com mais velocidade e qualidade
   - **Whisper local:** sem API, com processamento local no navegador
3. Em uma mensagem de voz, use o botão **Transcrever**

## <img src="https://cdn.simpleicons.org/securityscorecard/6B7280" width="16" alt="Privacy icon" /> Privacidade

- No modo **Whisper local**, a transcrição é feita no seu computador (via WASM no Chrome).
- No modo **Groq**, o áudio é enviado para a API da Groq usando a chave informada pelo usuário.

## <img src="https://cdn.simpleicons.org/files/9CA3AF" width="16" alt="Files icon" /> Estrutura principal

| Arquivo / pasta | Função |
|------------------|--------|
| `extension/manifest.json` | Manifesto MV3, permissões e ícones |
| `extension/content.js` | UI na página do WhatsApp (mundo isolado) |
| `extension/injected.js` | Acesso ao `window.require` / download de mídia (mundo principal) |
| `extension/background.js` | Service worker e roteamento para o offscreen |
| `extension/offscreen.js` | Carrega Whisper e transcreve |
| `extension/assets/` | Logos e recursos visuais |

## <img src="https://cdn.simpleicons.org/github/ffffff" width="16" alt="GitHub icon" /> Feedbacks e contribuições

Este projeto está em evolução. Se algo quebrar após uma atualização do WhatsApp Web, se tiver sugestão de UX ou quiser abrir um PR:

- Abra uma **issue** descrevendo o comportamento esperado vs. atual e, se possível, um print ou passos para reproduzir
- **Pull requests** são bem-vindos (documentação, correções de layout, robustez contra mudanças do DOM, etc.)

## Autoria

**Ariel Sousa** — criador e mantenedor do **WATranscribe**.

---

<div align="center">

Obrigado por testar o projeto.

</div>
