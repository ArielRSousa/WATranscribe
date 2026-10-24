# WATranscribe público, sem login

Produção: https://watranscribe-api.vercel.app

A extensão usa o endereço fixo do servidor e não solicita credenciais. As únicas variáveis obrigatórias na Vercel são `GROQ_API_KEYS` (array JSON de até 3 chaves), `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`. `CLIENT_TOKENS` não é mais utilizado e pode ser removido.

Configure as variáveis em Production e publique a pasta `server` com `npx vercel deploy --prod`. Node.js 22, sem framework; `vercel.json` define o diretório público. A vinculação automática ao GitHub não foi concluída, portanto os deploys são manuais.

## Controle de consumo

O Redis reserva atomicamente 5 tentativas/minuto e 20/dia por IP, além de 100 tentativas/dia para todo o serviço. As janelas começam na primeira tentativa; identificadores de IP mudam diariamente (UTC). Usuários da mesma rede compartilham cotas. Os limites são definidos em `lib/service.js`. A API é pública: clientes externos também podem chamá-la; os limites reduzem consumo, mas não garantem exclusividade à extensão nem prevenção total de abuso. Configure limites financeiros também no provedor.

O IP vem do cabeçalho sobrescrito pela Vercel; fora dela, somente o endereço do socket é usado. O Redis recebe um hash, não o IP bruto. Contadores expiram em até 24 horas. Se o Redis falhar, nenhuma transcrição é enviada. Requisições inválidas não consomem cota de transcrição.

Uma chave recusada com 401 permite tentar a próxima. Um 429 respeita Retry-After e pausa todas as chaves, sem contornar limites da Groq. Até 3 MB por áudio; JSON/base64 fica abaixo do limite de 4,5 MB da Vercel. O limite de tentativas não equivale a um limite exato de custo ou duração do áudio.

`GET /api/health` verifica configuração e Redis sem expor segredos; não valida as chaves na Groq. `POST /api/transcribe` aceita `{audioBase64,mimeType}` sem Authorization. A aplicação não persiste áudios ou textos. Política pública: `/privacy.html`.

Na raiz: `node --test tests/*.test.*`. Testes usam respostas simuladas. Validar transcrição real exige credenciais Groq e Redis configuradas.
