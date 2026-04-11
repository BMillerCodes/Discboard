import os
import discord
from discord.ext import commands
from typing import Optional
from app.config import settings

class DiscordBot:
    def __init__(self):
        self.bot: Optional[commands.Bot] = None
        self._started = False
    
    def create_bot(self) -> commands.Bot:
        intents = discord.Intents.default()
        intents.message_content = True
        intents.guilds = True
        intents.messages = True
        
        bot = commands.Bot(command_prefix="!", intents=intents)
        
        @bot.event
        async def on_ready():
            print(f"Discboard bot logged in as {bot.user}")
        
        return bot
    
    async def start(self):
        if self._started:
            return
        
        token = settings.DISCORD_BOT_TOKEN
        if not token:
            print("WARNING: DISCORD_BOT_TOKEN not set, bot not starting")
            return
        
        self.bot = self.create_bot()
        
        from app.discord.commands import setup_commands
        setup_commands(self.bot)
        
        await self.bot.start(token)
        self._started = True
    
    async def stop(self):
        if self.bot and self._started:
            await self.bot.close()
            self._started = False