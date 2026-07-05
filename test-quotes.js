// Teste do Edge Function - Cotações BrAPI v2
const SUPABASE_URL = 'https://prhqiwfucjbjvimzhgwl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Jpdcd96f7hD0CzXVXRFQNA_oH8AwImB';

async function testEdgeFunction() {
  console.log('🧪 Testando Edge Function app-proxy...\n');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/app-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        action: 'get_quotes',
        tickers: ['HGLG11', 'BTLG11', 'ALZR11']
      })
    });

    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Resposta:', JSON.stringify(data, null, 2));
    
    if (data.ok && data.prices && Object.keys(data.prices).length > 0) {
      console.log('\n✅ SUCESSO! Cotações recebidas:');
      for (const [ticker, price] of Object.entries(data.prices)) {
        const source = data.sources[ticker] || 'desconhecido';
        const updated = data.updatedAt[ticker] || 'N/A';
        console.log(`  ${ticker}: R$ ${price} (${source}) - ${updated}`);
      }
    } else {
      console.log('\n❌ FALHA! Verifique:');
      console.log('  - Edge Function foi redeployado?');
      console.log('  - Variável BRAPI_API_KEY está configurada?');
      console.log('  - Projeto Supabase está ativo?');
    }
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
    console.log('\nVerifique:');
    console.log('  - Projeto Supabase está ativo (não INACTIVE)?');
    console.log('  - URL do projeto está correta?');
  }
}

testEdgeFunction();
