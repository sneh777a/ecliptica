import pytest

from app.utils.security import hash_password, verify_password


def test_hash_password_rejects_passwords_longer_than_bcrypt_limit():
    long_password = "a" * 73

    with pytest.raises(ValueError, match="72 bytes"):
        hash_password(long_password)


def test_verify_password_rejects_overlong_passwords_without_truncating():
    long_password = "a" * 73
    stored_hash = "$2b$12$ZQ9oV7Q8QyF5m6V/8Qm6Z.Gf2wQ6VbD1m8M7wYQ0R4.tJ0Q0YvYd2"

    assert verify_password(long_password, stored_hash) is False
