#!/usr/bin/env python
"""Test dashboard API endpoint."""
import asyncio
import sys

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.security import create_access_token
from app.db.models.user import User


async def main():
    # Get admin user and create token
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        result = await session.execute(select(User).where(User.username == "admin"))
        user = result.scalar_one_or_none()

        if not user:
            print("ERROR: Admin user not found")
            sys.exit(1)

        token = create_access_token(str(user.id))

    await engine.dispose()

    # Test API endpoint
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                "http://localhost:8000/api/v1/dashboard/stats",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10.0,
            )

            print(f"Status Code: {response.status_code}")

            if response.status_code == 200:
                print("SUCCESS: API endpoint working")
                data = response.json()
                print(f"Total bins: {data['total_bins']}")
                print(f"Occupied bins: {data['occupied_bins']}")
                print(f"Warehouse occupancy items: {len(data['warehouse_occupancy'])}")
                print(f"Movement history items: {len(data['movement_history'])}")

                # Check date format
                if data['movement_history']:
                    print("\nFirst movement history item:")
                    print(f"  Date: {data['movement_history'][0]['date']}")
                    print(f"  Date type: {type(data['movement_history'][0]['date'])}")

                # Check full response structure
                import json
                print("\nFull response:")
                print(json.dumps(data, indent=2, default=str))
            else:
                print(f"ERROR: Status {response.status_code}")
                print(f"Response: {response.text}")
        except Exception as e:
            print(f"ERROR: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
