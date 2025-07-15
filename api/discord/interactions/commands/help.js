// Handler for the /help command
export async function handleHelp() {
  return {
    type: 4,
    data: {
      embeds: [
        {
          title: 'BUXDAO Bot Commands',
          color: 0x4CAF50,
          description: 'Here are all available commands and their options:',
          fields: [
            {
              name: '/profile [user]',
              value: 'View your BUXDAO profile. Admins can view any user.'
            },
            {
              name: '/mybux [user]',
              value: 'View your BUX token balance and cashout value. Admins can view any user.'
            },
            {
              name: '/mynfts [user]',
              value: 'View your NFT collection counts. Admins can view any user.'
            },
            {
              name: '/collections <collection>',
              value: 'View stats for a BUXDAO collection. Choose from dropdown.'
            },
            {
              name: '/addclaim <user> <amount>',
              value: 'Admin: Award BUX tokens to a user.'
            },
            {
              name: '/nft <collection> <id>',
              value: 'Look up NFT details by collection and token ID.'
            },
            {
              name: '/rank <collection> <rank>',
              value: 'Look up NFT by rarity rank in a collection.'
            }
          ],
          footer: { text: 'BUXDAO - Use /help anytime!' },
          timestamp: new Date().toISOString()
        }
      ],
      flags: 0
    }
  };
} 