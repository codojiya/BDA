from fastapi import Depends
from app.services.data_loader import DataLoader, get_data_loader

def get_loader() -> DataLoader:
    return get_data_loader()
