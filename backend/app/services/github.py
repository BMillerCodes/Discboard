import httpx
from typing import Optional
from app.config import settings

class GitHubClient:
    def __init__(self, token: str = None, org: str = None):
        self.token = token or settings.GITHUB_TOKEN
        self.org = org or settings.GITHUB_ORG
        self.client = httpx.AsyncClient(
            headers={"Authorization": f"Bearer {self.token}"} if self.token else {},
            timeout=30.0
        )
    
    async def get_repos(self) -> list[dict]:
        """Get repositories for the org/user."""
        if not self.token:
            return []
        
        try:
            resp = await self.client.get(
                f"https://api.github.com/orgs/{self.org}/repos",
                headers={"Accept": "application/vnd.github.v3+json"}
            )
            if resp.status_code == 200:
                return resp.json()
        except Exception as e:
            print(f"GitHub error: {e}")
        return []
    
    async def get_prs(self, repo: str, state: str = "open") -> list[dict]:
        """Get pull requests for a repository."""
        if not self.token:
            return []
        
        try:
            resp = await self.client.get(
                f"https://api.github.com/repos/{self.org}/{repo}/pulls",
                params={"state": state},
                headers={"Accept": "application/vnd.github.v3+json"}
            )
            if resp.status_code == 200:
                return resp.json()
        except Exception:
            pass
        return []
    
    async def get_issues(self, repo: str, state: str = "open") -> list[dict]:
        """Get issues for a repository."""
        if not self.token:
            return []
        
        try:
            resp = await self.client.get(
                f"https://api.github.com/repos/{self.org}/{repo}/issues",
                params={"state": state},
                headers={"Accept": "application/vnd.github.v3+json"}
            )
            if resp.status_code == 200:
                return resp.json()
        except Exception:
            pass
        return []
    
    async def get_workflow_runs(self, repo: str) -> list[dict]:
        """Get recent workflow runs."""
        if not self.token:
            return []
        
        try:
            resp = await self.client.get(
                f"https://api.github.com/repos/{self.org}/{repo}/actions/runs",
                headers={"Accept": "application/vnd.github.v3+json"}
            )
            if resp.status_code == 200:
                return resp.json().get("workflow_runs", [])
        except Exception:
            pass
        return []
    
    async def close(self):
        await self.client.aclose()