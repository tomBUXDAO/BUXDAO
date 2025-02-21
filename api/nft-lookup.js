import { handleNFTLookup } from './discord/interactions/commands/nft-lookup.js';
import { verifyKey } from 'discord-interactions';

export default async function handler(req, res) {
  // Return hardcoded response for testing
  return res.status(200).json({
    type: 4,
    data: {
      content: "",
      embeds: [{
        title: "Celebrity Catz #91",
        description: "[View on Magic Eden](https://magiceden.io/item-details/6DomCCeXwHFuNXYVEqu5GjnCGDtQLxfN7yLEuDtmMQpu) • [View on Tensor](https://www.tensor.trade/item/6DomCCeXwHFuNXYVEqu5GjnCGDtQLxfN7yLEuDtmMQpu)\n\nMint: `6DomCCeXwHFuNXYVEqu5GjnCGDtQLxfN7yLEuDtmMQpu`",
        color: 0xFF4D4D,
        fields: [
          {
            name: '👤 Owner',
            value: '`342t...Jb24`',
            inline: true
          },
          {
            name: '🏷️ Status',
            value: 'Not Listed',
            inline: true
          }
        ],
        thumbnail: {
          url: 'https://buxdao.com/logos/celeb.PNG'
        },
        image: {
          url: 'https://nftstorage.link/ipfs/bafybeiaa4cjqgorisonu4bptgzzvy6nfadfhpmcgjrvq5cygknsaonq5nq/1.png'
        },
        footer: {
          text: 'BUXDAO • Putting Community First'
        }
      }]
    }
  });
} 