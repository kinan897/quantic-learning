"""Shared FastAPI dependencies. Tests can swap these with ``app.dependency_overrides``."""

from typing import Annotated

from fastapi import Depends

from app.content.loader import Catalog, get_catalog

CatalogDep = Annotated[Catalog, Depends(get_catalog)]
