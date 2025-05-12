import fs from 'fs/promises';
import path from 'path';
import { sendDiscordNotification } from '../buxdao-nft-sync/sync-nft-ownership.js';

async function retryFailedNotifications() {
  try {
    console.log('Looking for failed notifications to retry...');
    
    // Get ownership change logs
    const logDir = path.join(process.cwd(), 'logs', 'ownership-changes');
    const files = await fs.readdir(logDir);
    
    // Process all log files
    let totalRetried = 0;
    let totalSuccess = 0;
    
    for (const file of files) {
      if (!file.startsWith('ownership-changes-')) continue;
      
      const logPath = path.join(logDir, file);
      const content = await fs.readFile(logPath, 'utf8');
      const changes = JSON.parse(content);
      
      // Find failed notifications
      const failed = changes.filter(c => !c.notificationSent);
      
      if (failed.length > 0) {
        console.log(`\nProcessing ${failed.length} failed notifications from ${file}`);
        
        // Retry each failed notification
        for (const change of failed) {
          totalRetried++;
          console.log(`\nRetrying notification for ${change.type} - ${change.nft.name}`);
          
          const success = await sendDiscordNotification({
            type: change.type,
            nft: change.nft,
            ...(change.salePrice && { salePrice: change.salePrice }),
            ...(change.marketplace && { marketplace: change.marketplace }),
            ...(change.newOwner && { newOwner: change.newOwner })
          });
          
          if (success) {
            totalSuccess++;
            console.log('✓ Notification sent successfully');
            
            // Update the log file
            const changeIndex = changes.findIndex(c => 
              c.nft.mint_address === change.nft.mint_address && 
              c.timestamp === change.timestamp
            );
            
            if (changeIndex !== -1) {
              changes[changeIndex].notificationSent = true;
              changes[changeIndex].retryTimestamp = new Date().toISOString();
              await fs.writeFile(logPath, JSON.stringify(changes, null, 2));
            }
          } else {
            console.log('✗ Notification failed again');
          }
        }
      }
    }
    
    console.log('\nRetry Summary:');
    console.log('-------------');
    console.log(`Total notifications retried: ${totalRetried}`);
    console.log(`Successful retries: ${totalSuccess}`);
    console.log(`Failed retries: ${totalRetried - totalSuccess}`);
    
  } catch (error) {
    console.error('Error retrying notifications:', error);
  }
}

// Run the retry script
retryFailedNotifications(); 