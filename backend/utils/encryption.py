import base64
import hashlib
import logging

from cryptography.fernet import Fernet, InvalidToken

from utils.config import settings

logger = logging.getLogger(__name__)


def _get_fernet() -> Fernet:
    key = base64.urlsafe_b64encode(
        hashlib.sha256(settings.secret_key.encode()).digest()
    )
    return Fernet(key)


def encrypt_token(token: str) -> str:
    return _get_fernet().encrypt(token.encode()).decode()


def decrypt_token(encrypted: str) -> str:
    try:
        return _get_fernet().decrypt(encrypted.encode()).decode()
    except InvalidToken:
        logger.error("Failed to decrypt GitHub token: secret_key may have changed")
        raise
