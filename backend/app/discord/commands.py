from discord.ext import commands
from discord import app_commands, Embed, SelectMenu, SelectOption
from datetime import datetime
import httpx

BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")

def setup_commands(bot: commands.Bot):
    
    @bot.tree.command(name="sessions", description="List active sessions")
    async def list_sessions(interaction):
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(f"{BASE_URL}/api/sessions?limit=10")
                if resp.status_code == 200:
                    sessions = resp.json()
                    if not sessions:
                        await interaction.response.send_message("No active sessions", ephemeral=True)
                        return
                    
                    embed = Embed(title="📋 Active Sessions", color=0x00ff00)
                    for s in sessions[:5]:
                        embed.add_field(
                            name=f"**{s['title']}**",
                            value=f"Model: {s['model']} | Messages: {s['message_count']} | Status: {s['status']}",
                            inline=False
                        )
                    await interaction.response.send_message(embed=embed, ephemeral=True)
                else:
                    await interaction.response.send_message("Failed to fetch sessions", ephemeral=True)
            except Exception as e:
                await interaction.response.send_message(f"Error: {str(e)}", ephemeral=True)
    
    @bot.tree.command(name="status", description="System status overview")
    async def system_status(interaction):
        async with httpx.AsyncClient() as client:
            try:
                # Get health check
                resp = await client.get(f"{BASE_URL}/api/health")
                health = resp.json() if resp.status_code == 200 else {}
                
                # Get services
                resp2 = await client.get(f"{BASE_URL}/api/services?limit=10")
                services = resp2.json() if resp2.status_code == 200 else []
                
                embed = Embed(title="🎛️ Discboard System Status", color=0x3498db, timestamp=datetime.utcnow())
                embed.add_field(name="API Status", value=health.get("status", "unknown"), inline=True)
                embed.add_field(name="Version", value=health.get("version", "0.1.0"), inline=True)
                
                healthy = sum(1 for s in services if s.get("status") == "healthy")
                degraded = sum(1 for s in services if s.get("status") == "degraded")
                down = sum(1 for s in services if s.get("status") == "down")
                
                status_lines = f"🟢 Healthy: {healthy}\n🟡 Degraded: {degraded}\n🔴 Down: {down}"
                embed.add_field(name="Services", value=status_lines, inline=False)
                
                await interaction.response.send_message(embed=embed, ephemeral=True)
            except Exception as e:
                await interaction.response.send_message(f"Error: {str(e)}", ephemeral=True)
    
    @bot.tree.command(name="model", description="Show or switch model")
    async def model_info(interaction):
        embed = Embed(title="🤖 Model Configuration", color=0x9b59b6)
        embed.add_field(name="Primary", value="MiniMax-M2.7 ($0.30/M in / $1.20/M out)", inline=False)
        embed.add_field(name="Fallback", value="gemini-3-flash-preview", inline=False)
        embed.add_field(name="Context", value="204,800 tokens", inline=False)
        
        view = ModelSwitchView()
        await interaction.response.send_message(embed=embed, view=view, ephemeral=True)
    
    @bot.tree.command(name="services", description="List monitored services")
    async def list_services(interaction):
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(f"{BASE_URL}/api/services?limit=10")
                if resp.status_code == 200:
                    services = resp.json()
                    if not services:
                        await interaction.response.send_message("No services configured", ephemeral=True)
                        return
                    
                    embed = Embed(title="🖥️ Monitored Services", color=0xe67e22)
                    for s in services[:5]:
                        status_emoji = "🟢" if s.get("status") == "healthy" else "🟡" if s.get("status") == "degraded" else "🔴"
                        embed.add_field(
                            name=f"{status_emoji} {s['icon']} {s['name']}",
                            value=f"URL: {s['url']}\nUptime: {s.get('uptime_pct', 0):.1f}% | Response: {s.get('response_time_ms', 'N/A')}ms",
                            inline=False
                        )
                    await interaction.response.send_message(embed=embed, ephemeral=True)
                else:
                    await interaction.response.send_message("Failed to fetch services", ephemeral=True)
            except Exception as e:
                await interaction.response.send_message(f"Error: {str(e)}", ephemeral=True)
    
    @bot.tree.command(name="bookmarks", description="List your bookmarks")
    async def list_bookmarks(interaction, search: str = None):
        async with httpx.AsyncClient() as client:
            try:
                url = f"{BASE_URL}/api/bookmarks?limit=10"
                if search:
                    url += f"&search={search}"
                
                resp = await client.get(url)
                if resp.status_code == 200:
                    bookmarks = resp.json()
                    if not bookmarks:
                        await interaction.response.send_message("No bookmarks found", ephemeral=True)
                        return
                    
                    embed = Embed(title="🔖 Bookmarks", color=0xf1c40f)
                    for b in bookmarks[:5]:
                        tags_str = ", ".join(b.get("tags", [])) or "untagged"
                        embed.add_field(
                            name=f"**{b['label']}**",
                            value=f"[{b['url']}]({b['url']})\nTags: {tags_str}",
                            inline=False
                        )
                    await interaction.response.send_message(embed=embed, ephemeral=True)
                else:
                    await interaction.response.send_message("Failed to fetch bookmarks", ephemeral=True)
            except Exception as e:
                await interaction.response.send_message(f"Error: {str(e)}", ephemeral=True)
    
    @bot.tree.command(name="bookmark-add", description="Add a bookmark")
    async def add_bookmark(interaction, url: str, label: str, tags: str = None):
        async with httpx.AsyncClient() as client:
            try:
                data = {"url": url, "label": label, "tags": tags.split(",") if tags else []}
                resp = await client.post(f"{BASE_URL}/api/bookmarks", json=data)
                if resp.status_code == 200:
                    b = resp.json()
                    await interaction.response.send_message(f"✅ Added bookmark: **{b['label']}**", ephemeral=True)
                else:
                    await interaction.response.send_message("Failed to add bookmark", ephemeral=True)
            except Exception as e:
                await interaction.response.send_message(f"Error: {str(e)}", ephemeral=True)
    
    @bot.tree.command(name="search", description="Search across all content")
    async def search_all(interaction, query: str):
        # Unified search across sessions, bookmarks, services
        async with httpx.AsyncClient() as client:
            try:
                results = {"sessions": [], "bookmarks": [], "services": []}
                
                # Search sessions
                r1 = await client.get(f"{BASE_URL}/api/sessions?limit=5")
                if r1.status_code == 200:
                    sessions = r1.json()
                    results["sessions"] = [s for s in sessions if query.lower() in s.get("title", "").lower()]
                
                # Search bookmarks
                r2 = await client.get(f"{BASE_URL}/api/bookmarks?search={query}&limit=5")
                if r2.status_code == 200:
                    results["bookmarks"] = r2.json()
                
                # Search services
                r3 = await client.get(f"{BASE_URL}/api/services?limit=5")
                if r3.status_code == 200:
                    services = r3.json()
                    results["services"] = [s for s in services if query.lower() in s.get("name", "").lower()]
                
                embed = Embed(title=f"🔍 Search Results for: {query}", color=0x3498db)
                
                if results["sessions"]:
                    session_list = "\n".join([f"- **{s['title']}** ({s['status']})" for s in results["sessions"]])
                    embed.add_field(name="Sessions", value=session_list, inline=False)
                
                if results["bookmarks"]:
                    bm_list = "\n".join([f"- **{b['label']}**: {b['url']}" for b in results["bookmarks"]])
                    embed.add_field(name="Bookmarks", value=bm_list, inline=False)
                
                if results["services"]:
                    svc_list = "\n".join([f"- {s['icon']} {s['name']}" for s in results["services"]])
                    embed.add_field(name="Services", value=svc_list, inline=False)
                
                if not any(results.values()):
                    embed.description = "No results found"
                
                await interaction.response.send_message(embed=embed, ephemeral=True)
            except Exception as e:
                await interaction.response.send_message(f"Error: {str(e)}", ephemeral=True)


class ModelSwitchView(discord.ui.View):
    @discord.ui.select(
        placeholder="Switch model...",
        options=[
            SelectOption(label="MiniMax-M2.7", value="MiniMax-M2.7", description="Primary model"),
            SelectOption(label="gemini-3-flash-preview", value="gemini-3-flash-preview", description="Fast fallback"),
        ]
    )
    async def select_model(self, interaction, select):
        await interaction.response.send_message(f"Model switched to: **{select.values[0]}**", ephemeral=True)


import os