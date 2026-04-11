from fastapi import APIRouter, HTTPException
from typing import Optional
from app.services.github import GitHubClient

router = APIRouter(prefix="/api/github", tags=["github"])


@router.get("/repos")
async def list_repos():
    """List repositories for configured org."""
    client = GitHubClient()
    repos = await client.get_repos()
    await client.close()
    
    # Return simplified repo info
    return [
        {
            "id": r.get("id"),
            "name": r.get("name"),
            "full_name": r.get("full_name"),
            "description": r.get("description"),
            "url": r.get("html_url"),
            "default_branch": r.get("default_branch"),
            "stars": r.get("stargazers_count", 0),
            "open_issues": r.get("open_issues_count", 0),
        }
        for r in repos
    ]


@router.get("/repos/{repo}/pulls")
async def list_pulls(repo: str, state: str = "open"):
    """List open PRs with status, author, labels, date."""
    client = GitHubClient()
    prs = await client.get_prs(repo, state=state)
    await client.close()
    
    return [
        {
            "number": pr.get("number"),
            "title": pr.get("title"),
            "state": pr.get("state"),
            "author": pr.get("user", {}).get("login", "unknown"),
            "labels": [l.get("name") for l in pr.get("labels", [])],
            "created_at": pr.get("created_at"),
            "url": pr.get("html_url"),
            "draft": pr.get("draft", False),
            "merged": pr.get("merged", False),
            "updated_at": pr.get("updated_at"),
        }
        for pr in prs
    ]


@router.get("/repos/{repo}/issues")
async def list_issues(repo: str, state: str = "open"):
    """List open issues for a repository."""
    client = GitHubClient()
    issues = await client.get_issues(repo, state=state)
    await client.close()
    
    # Filter out PRs (GitHub API returns PRs in issues endpoint)
    issues_only = [i for i in issues if not i.get("pull_request")]
    
    return [
        {
            "number": issue.get("number"),
            "title": issue.get("title"),
            "state": issue.get("state"),
            "author": issue.get("user", {}).get("login", "unknown"),
            "labels": [l.get("name") for l in issue.get("labels", [])],
            "created_at": issue.get("created_at"),
            "url": issue.get("html_url"),
            "comments": issue.get("comments", 0),
        }
        for issue in issues_only
    ]


@router.get("/repos/{repo}/workflows")
async def list_workflows(repo: str):
    """List recent workflow runs for a repository."""
    client = GitHubClient()
    runs = await client.get_workflow_runs(repo)
    await client.close()
    
    return [
        {
            "id": run.get("id"),
            "name": run.get("name"),
            "status": run.get("status"),
            "conclusion": run.get("conclusion"),
            "created_at": run.get("created_at"),
            "url": run.get("html_url"),
            "actor": run.get("actor", {}).get("login", "unknown"),
            "branch": run.get("head_branch"),
        }
        for run in runs
    ]