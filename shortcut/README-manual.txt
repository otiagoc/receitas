Atalho "Guardar Receita" — criar à mão na app Atalhos (só se o ficheiro .shortcut não funcionar)

1. Atalhos > "+" > nome: Guardar Receita.
2. Toca no (i) / Detalhes > ativa "Mostrar na Folha de Partilha".
   Em "Recebe", deixa só URLs e Texto. "Se não houver entrada": Obter Área de Transferência.
3. Ação "Obter URLs a partir de" > Entrada do Atalho.
4. Ação "Obter item da lista" > Primeiro item > de URLs.
5. Ação "Obter conteúdo de URL":
   URL: https://vhvhwfwkfdfzjoiqqqok.supabase.co/rest/v1/rpc/enqueue_recipe
   Método: POST
   Cabeçalhos:  apikey = sb_publishable_x-_kXcu3XoDtwA6p04UFyQ_hB10FJIP
                Content-Type = application/json
   Corpo do pedido: JSON
     p_token (Texto) = cola o token que aparece em Definições na app
     p_url   (Texto) = variável "Item da lista"
6. Ação "Texto" com a variável "Conteúdo do URL".
7. Ação "Se": Texto  contém  "message"
     - Obter dicionário a partir de Texto
     - Obter valor de "message" no Dicionário
     - Mostrar notificação: Não consegui adicionar: [Valor do dicionário]
   Caso contrário
     - Mostrar notificação: Receita adicionada 🍳 — vai aparecer na app daqui a uns minutos
   Terminar se
8. Testa: no Instagram, num reel > Partilhar > "Guardar Receita".
   (Se não aparecer: na folha de partilha, desliza até ao fim > Editar ações > adiciona "Guardar Receita".)
