import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Warpcast API endpoint
const WARPCAST_CHANNELS_API = 'https://api.warpcast.com/v2/all-channels';

// Keywords to monitor for in channel names or descriptions
const KEYWORDS = ['airdrop', 'token launch', 'new token', 'giveaway'];

// File to store notified channels
const NOTIFIED_CHANNELS_FILE = 'notified_channels.json';

// Load notified channels from file
function loadNotifiedChannels() {
    try {
        const data = fs.readFileSync(NOTIFIED_CHANNELS_FILE, 'utf8');
        return new Set(JSON.parse(data));
    } catch (err) {
        return new Set(); // Return empty set if file does not exist
    }
}

// Save notified channels to file
function saveNotifiedChannels(notifiedChannels) {
    fs.writeFileSync(NOTIFIED_CHANNELS_FILE, JSON.stringify([...notifiedChannels]), 'utf8');
}

// Function to fetch all channels from Warpcast
async function getAllChannels() {
    const response = await fetch(WARPCAST_CHANNELS_API);
    const data = await response.json();
    return data.result?.channels || [];
}

// Check if a channel has keywords like airdrop or token launch
function checkForKeywords(channel) {
    const description = channel.description?.toLowerCase() || '';
    const name = channel.name?.toLowerCase() || '';

    return KEYWORDS.some(keyword => description.includes(keyword) || name.includes(keyword));
}

// Send a message to the Telegram group
async function sendTelegramMessage(channel) {
    const message = `🚨 New Airdrop or Token Launch Alert! 🚨\n\n` +
                    `**Channel**: ${channel.name}\n` +
                    `**Description**: ${channel.description}\n` +
                    `**Link**: ${channel.url}`;
    
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        })
    });

    const data = await response.json();
    if (!data.ok) {
        console.error('Failed to send message to Telegram:', data.description);
    }
}

// Monitor channels for new airdrops or token launches
async function monitorChannels() {
    const notifiedChannels = loadNotifiedChannels();  // Load notified channels
    const channels = await getAllChannels();  // Fetch all channels

    for (const channel of channels) {
        if (!notifiedChannels.has(channel.id) && checkForKeywords(channel)) {
            await sendTelegramMessage(channel);  // Send notification to Telegram
            notifiedChannels.add(channel.id);   // Mark channel as notified
            saveNotifiedChannels(notifiedChannels);  // Save updated channels list
        }
    }
}

// Command handler for getting the latest airdrop mention
// Command handler for getting the latest airdrop mention
// Command handler for getting the latest airdrop mention
async function getLatestAirdropMention() {
    try {
        const response = await fetch(WARPCAST_CHANNELS_API);
        const channelsData = await response.json();
        
        // Log the entire response to check the structure
        console.log('API Response:', channelsData);
        
        const channels = channelsData.result?.channels;

        if (!channels || channels.length === 0) {
            console.log('No channels found.');
            return;
        }

        let latestAirdrop = null;

        // Iterate through the channels and check for the 'airdrop' keyword directly from the API response
        for (const channel of channels) {
            if (channel.description && channel.description.toLowerCase().includes('airdrop')) {
                latestAirdrop = channel;
                break;
            }
        }

        if (latestAirdrop) {
            await sendTelegramMessage({
                name: latestAirdrop.name,
                description: latestAirdrop.description,
                url: latestAirdrop.url // Make sure the URL is present in the API response
            });
        } else {
            console.log('No airdrop mentions found.');
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}



// Test command
getLatestAirdropMention();
