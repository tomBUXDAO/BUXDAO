import { sql } from '@vercel/postgres';

export const config = {
  runtime: 'edge'
};

async function updateDiscordRoles(userId, roles) {
  const DISCORD_API = 'https://discord.com/api/v10';
  const GUILD_ID = process.env.DISCORD_GUILD_ID;

  try {
    // Get current member roles
    const memberResponse = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/members/${userId}`, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`
      }
    });
    
    if (!memberResponse.ok) {
      throw new Error('Failed to fetch member roles');
    }

    const member = await memberResponse.json();
    const currentRoles = member.roles || [];

    // Get role IDs from database
    const { rows } = await sql`SELECT * FROM roles`;
    const rolesToAssign = [];

    // Add roles based on user's role flags
    if (roles.fcked_catz_holder) rolesToAssign.push(rows.find(r => r.name === 'FCKed Catz Holder')?.discord_role_id);
    if (roles.money_monsters_holder) rolesToAssign.push(rows.find(r => r.name === 'Money Monsters Holder')?.discord_role_id);
    if (roles.moneymonsters3d_holder) rolesToAssign.push(rows.find(r => r.name === 'Money Monsters 3D Holder')?.discord_role_id);
    if (roles.ai_bitbots_holder) rolesToAssign.push(rows.find(r => r.name === 'AI BitBots Holder')?.discord_role_id);
    if (roles.celebcatz_holder) rolesToAssign.push(rows.find(r => r.name === 'Celebrity Catz Holder')?.discord_role_id);
    
    if (roles.fcked_catz_whale) rolesToAssign.push(rows.find(r => r.name === 'FCKed Catz Whale')?.discord_role_id);
    if (roles.money_monsters_whale) rolesToAssign.push(rows.find(r => r.name === 'Money Monsters Whale')?.discord_role_id);
    if (roles.moneymonsters3d_whale) rolesToAssign.push(rows.find(r => r.name === 'Money Monsters 3D Whale')?.discord_role_id);
    if (roles.ai_bitbots_whale) rolesToAssign.push(rows.find(r => r.name === 'AI BitBots Whale')?.discord_role_id);
    
    if (roles.bux_beginner) rolesToAssign.push(rows.find(r => r.name === 'BUX Beginner')?.discord_role_id);
    if (roles.bux_builder) rolesToAssign.push(rows.find(r => r.name === 'BUX Builder')?.discord_role_id);
    if (roles.bux_saver) rolesToAssign.push(rows.find(r => r.name === 'BUX Saver')?.discord_role_id);
    if (roles.bux_banker) rolesToAssign.push(rows.find(r => r.name === 'BUX Banker')?.discord_role_id);
    
    if (roles.buxdao_5) rolesToAssign.push(rows.find(r => r.name === 'BUXDAO 5')?.discord_role_id);

    // Filter out any undefined roles and combine with current roles
    const validRoles = rolesToAssign.filter(Boolean);
    const updatedRoles = [...new Set([...currentRoles, ...validRoles])];

    // Update member roles
    const updateResponse = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/members/${userId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        roles: updatedRoles
      })
    });

    if (!updateResponse.ok) {
      throw new Error('Failed to update member roles');
    }

    return updatedRoles;
  } catch (error) {
    console.error('Error updating Discord roles:', error);
    throw error;
  }
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  try {
    const { walletAddress, discord_id, discord_username } = await req.json();

    if (!walletAddress || !discord_id || !discord_username) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    try {
      // Begin transaction
      await sql`BEGIN`;

      // Insert or update user in user_roles table
      const result = await sql`
        INSERT INTO user_roles (discord_id, wallet_address, discord_name)
        VALUES (${discord_id}, ${walletAddress}, ${discord_username})
        ON CONFLICT (discord_id) 
        DO UPDATE SET 
          wallet_address = ${walletAddress},
          discord_name = ${discord_username},
          last_updated = CURRENT_TIMESTAMP
        RETURNING *
      `;

      // Update owner info in nft_metadata table
      await sql`
        UPDATE nft_metadata 
        SET owner_discord_id = ${discord_id},
            owner_name = ${discord_username}
        WHERE owner_wallet = ${walletAddress}
      `;

      // Insert or update bux_holders table
      await sql`
        INSERT INTO bux_holders (wallet_address, owner_discord_id, owner_name)
        VALUES (${walletAddress}, ${discord_id}, ${discord_username})
        ON CONFLICT (wallet_address) 
        DO UPDATE SET 
          owner_discord_id = ${discord_id},
          owner_name = ${discord_username},
          last_updated = CURRENT_TIMESTAMP
      `;

      // Commit transaction
      await sql`COMMIT`;

      // Update Discord roles based on user's role flags
      const updatedRoles = await updateDiscordRoles(discord_id, result.rows[0]);

      return new Response(JSON.stringify({
        success: true,
        user: result.rows[0],
        roles: updatedRoles
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      // Rollback transaction on error
      await sql`ROLLBACK`;
      throw error;
    }

  } catch (error) {
    console.error('Wallet verification error:', error);
    return new Response(JSON.stringify({ 
      error: 'Verification failed',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
} 