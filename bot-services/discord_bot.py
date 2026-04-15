import os
import json
from pathlib import Path
import httpx
import discord
from discord.ext import commands
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / '.env')

DISCORD_BOT_TOKEN = os.getenv('DISCORD_BOT_TOKEN')
DJANGO_API_URL = os.getenv('DJANGO_API_URL', 'http://127.0.0.1:8000/v1')
DJANGO_API_HOST = os.getenv('DJANGO_API_HOST', 'api.localhost')
SECRET_TOKEN = os.getenv('SECRET_TOKEN')

# API Constants
BOT_CREATE_ENDPOINT = '/bots/create/'
MESSAGE_ENDPOINT = '/moderate/message/'
BOT_PLATFORM_DISCORD = 'Discord'
BOT_UUID_RESPONSE_KEY = 'bot_id'

TOXICITY_THRESHOLD = 0.6

# Create bot with intents
intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True

bot = commands.Bot(command_prefix='!', intents=intents)

# Reusable HTTP client for connection pooling
http_client = None


async def get_http_client():
    """Get or create a reusable AsyncClient for connection pooling."""
    global http_client
    if http_client is None:
        http_client = httpx.AsyncClient()
    return http_client


async def create_bot_on_django(guild_id, guild_name):
    """
    Request the Django server to create a new bot record.

    Args:
        guild_id: The Discord guild ID to use as group_identifier.
        guild_name: The Discord guild name to use as group_name.

    Returns:
        str: The bot UUID if successful, None otherwise.
    """
    try:
        client = await get_http_client()
        response = await client.post(
            f'{DJANGO_API_URL}{BOT_CREATE_ENDPOINT}',
            json={'platform': BOT_PLATFORM_DISCORD, 'group_identifier': str(guild_id), 'group_name': guild_name},
            headers={'Host': DJANGO_API_HOST, 'Authorization': f'Token {SECRET_TOKEN}'},
            timeout=None,
        )
        response.raise_for_status()

        try:
            data = response.json()
        except json.JSONDecodeError as e:
            print(f'Error: Failed to parse Django server response: {e}')
            return None

        bot_uuid = data.get(BOT_UUID_RESPONSE_KEY)
        if not bot_uuid:
            print(f'Error: No {BOT_UUID_RESPONSE_KEY} in response from Django server')
            return None

        return bot_uuid

    except httpx.ConnectError:
        print(f'Error: Could not connect to Django server at {DJANGO_API_URL}')
        return None
    except httpx.HTTPStatusError as e:
        print(f'Error: Django server returned {e.response.status_code}: {e.response.text}')
        return None
    except httpx.TimeoutException:
        print('Error: Request to Django server timed out')
        return None
    except Exception as e:
        print(f'Unexpected error while creating bot on Django: {e}')
        return None


def create_setup_embed(bot_uuid):
    """Create the setup instruction embed."""
    embed = discord.Embed(
        title='🤖 Toxic Chat Moderator Bot Setup',
        description='Thank you for adding the Toxic Chat Moderator bot to your server!',
        color=discord.Color.blue()
    )
    embed.add_field(
        name='Your Bot UUID:',
        value=f'`{bot_uuid}`',
        inline=False
    )
    embed.add_field(
        name='📋 Setup Instructions:',
        value=(
            '1. Visit the dashboard at https://your-domain.com/login\n'
            '2. Log in or create an account\n'
            '3. Go to your Bot Settings\n'
            '4. Click "Link New Bot"\n'
            f'5. Enter this UUID: `{bot_uuid}`\n'
            '6. Complete the setup and your bot will be active!\n\n'
            '⚠️ **Important:** Your bot will not function until you link this UUID to your account.'
        ),
        inline=False
    )
    embed.set_footer(text='Need help? Check our documentation at https://your-domain.com/docs')
    return embed


async def send_setup_message(channel, bot_uuid):
    """Send setup instructions to a Discord channel."""
    try:
        embed = create_setup_embed(bot_uuid)
        await channel.send(embed=embed)
        return True
    except discord.Forbidden:
        print(f'Error: No permission to send message in {channel.name}')
        return False
    except discord.HTTPException as e:
        print(f'Error: Failed to send setup message: {e}')
        return False


async def moderate_message(text, sender, guild_id):
    """
    Send a message to the Django moderate/message endpoint for toxicity classification.

    Returns:
        dict: The response data if successful, None otherwise.
    """
    try:
        client = await get_http_client()
        response = await client.post(
            f'{DJANGO_API_URL}{MESSAGE_ENDPOINT}',
            json={
                'text': text,
                'sender': sender,
                'platform': BOT_PLATFORM_DISCORD,
                'group_identifier': str(guild_id),
            },
            headers={'Host': DJANGO_API_HOST, 'Authorization': f'Token {SECRET_TOKEN}'},
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()
    except httpx.ConnectError:
        print(f'Error: Could not connect to Django server at {DJANGO_API_URL}')
        return None
    except httpx.HTTPStatusError as e:
        print(f'Error: Django server returned {e.response.status_code}: {e.response.text}')
        return None
    except httpx.TimeoutException:
        print('Error: Request to Django server timed out')
        return None
    except Exception as e:
        print(f'Unexpected error while moderating message: {e}')
        return None


@bot.event
async def on_ready():
    """Event triggered when the bot is ready and connected to Discord."""
    print(f'{bot.user} has connected to Discord!')


@bot.event
async def on_guild_join(guild):
    """
    Event triggered when the bot is added to a server (guild).
    Creates a new bot record in the Django server and sends setup instructions.
    """
    bot_uuid = await create_bot_on_django(guild.id, guild.name)
    if not bot_uuid:
        print(f'Failed to create bot for guild {guild.name}')
        return

    # Find the first text channel with send permissions
    channel = next(
        (ch for ch in guild.text_channels
         if ch.permissions_for(guild.me).send_messages),
        None
    )

    if channel:
        await send_setup_message(channel, bot_uuid)
    else:
        print(f'Could not find a text channel with send permissions in {guild.name}')


@bot.event
async def on_guild_remove(guild):
    """Event triggered when the bot is removed from a server."""
    print(f'Bot has been removed from {guild.name}')


@bot.event
async def on_message(message):
    """Listen for user messages and send them to the Django message endpoint."""
    # Ignore messages from bots (including ourselves)
    if message.author.bot:
        return

    # Ignore DMs
    if not message.guild:
        return

    # Let commands still work
    await bot.process_commands(message)

    # Skip command messages
    if message.content.startswith(bot.command_prefix):
        return

    # Skip empty messages (images, embeds only, etc.)
    if not message.content:
        return

    result = await moderate_message(
        text=message.content,
        sender=str(message.author),
        guild_id=message.guild.id,
    )

    if not result:
        return

    toxicity = result.get('toxicity', 0.0)
    if toxicity >= TOXICITY_THRESHOLD:
        # Delete the flagged message
        try:
            await message.delete()
        except discord.Forbidden:
            print(f'Error: No permission to delete message in {message.channel.name}')
        except discord.HTTPException as e:
            print(f'Error: Failed to delete message: {e}')

        # Create and send notification embed
        embed = discord.Embed(
            title='🚫 Message Flagged and Deleted',
            description=f'A message from {message.author.mention} was flagged and has been removed.',
            color=discord.Color.red()
        )
        embed.add_field(name='Reason', value='This message violated community guidelines. [View details on the dashboard](https://your-domain.com/dashboard)', inline=False)
        embed.set_footer(text=f'Model: {result.get("model_version", "unknown")}')

        try:
            await message.channel.send(embed=embed)
        except discord.Forbidden:
            print(f'Error: No permission to send message in {message.channel.name}')
        except discord.HTTPException as e:
            print(f'Error: Failed to send notification: {e}')


@bot.command(name='status')
async def status_command(ctx):
    """Command to check the bot's status."""
    embed = discord.Embed(
        title='Bot Status',
        description='The Toxic Chat Moderator bot is online and ready!',
        color=discord.Color.green()
    )
    embed.add_field(name='Latency', value=f'{bot.latency * 1000:.2f}ms', inline=False)
    await ctx.send(embed=embed)


@bot.command(name='setup')
async def setup_command(ctx):
    """
    Manually trigger bot setup and receive your bot UUID.

    This command creates a new bot record on the Django server and displays
    your unique bot UUID along with setup instructions.

    Usage: !setup
    """
    async with ctx.typing():
        bot_uuid = await create_bot_on_django(ctx.guild.id, ctx.guild.name)

    if bot_uuid:
        await send_setup_message(ctx.channel, bot_uuid)
    else:
        embed = discord.Embed(
            title='❌ Setup Failed',
            description='Could not create bot on the server. Please try again later.',
            color=discord.Color.red()
        )
        await ctx.send(embed=embed)


async def close_http_client():
    """Close the reusable HTTP client on bot shutdown."""
    global http_client
    if http_client is not None:
        await http_client.aclose()
        http_client = None


def main():
    """Main entry point for the bot."""
    if not DISCORD_BOT_TOKEN:
        raise ValueError('DISCORD_BOT_TOKEN environment variable is not set')

    try:
        bot.run(DISCORD_BOT_TOKEN)
    finally:
        pass


if __name__ == '__main__':
    main()
