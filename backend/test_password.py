"""plan-13: change-password logic — the hash round-trip the endpoint relies on."""
from app.auth import hash_password, verify_password


def test_change_password_roundtrip():
    old = hash_password("demo1234")
    assert verify_password("demo1234", old)
    # simulate the endpoint: verify current, then store new
    assert verify_password("demo1234", old), "current must verify"
    new = hash_password("newpass99")
    assert verify_password("newpass99", new), "new password works"
    assert not verify_password("demo1234", new), "old password no longer works"


if __name__ == "__main__":
    test_change_password_roundtrip()
    print("ok")
