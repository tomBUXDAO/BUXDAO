import { sendActivityNotification } from './api/integrations/discord/notifications.js';

// Test burn notification
async function testBurnNotification() {
  console.log('Testing burn notification...');
  
  const burnMessage = {
    content: '',
    embeds: [{
      title: '🔥 NFT Burned',
      description: '**Fcked Cat #595** has been burned',
      color: 0xFF0000, // Red color for burns
      fields: [
        {
          name: 'Previous Owner',
          value: 'Unknown Wallet',
          inline: true
        },
        {
          name: 'Collection',
          value: 'FCKEDCATZ',
          inline: true
        },
        {
          name: 'Rarity Rank',
          value: '1385',
          inline: true
        }
      ],
      thumbnail: {
        url: 'https://arweave.net/RMRDugFO6Vb1gmECk4U_zxLjU29UJQUgNpBj-NuW5dU'
      },
      footer: {
        text: 'BUXDAO NFT Monitor'
      },
      timestamp: new Date().toISOString()
    }]
  };
  
  try {
    const result = await sendActivityNotification(burnMessage);
    console.log('Burn notification result:', result);
    return result;
  } catch (error) {
    console.error('Error sending burn notification:', error);
    return false;
  }
}

// Run the test
testBurnNotification()
  .then(result => {
    if (result) {
      console.log('✅ Burn notification test passed!');
    } else {
      console.log('❌ Burn notification test failed!');
    }
    process.exit(result ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  }); 