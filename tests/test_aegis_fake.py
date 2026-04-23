"""
Tests using fake incident injection - no live web calls required.
Run with: pytest tests/test_aegis_fake.py -v
"""
import pytest
from genlayer_test import ContractRunner

ADMIN = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
UNISWAP_SOURCES = "https://api.llama.fi/tvl/uniswap\nhttps://rekt.news/\nhttps://defillama.com/hacks"
AAVE_SOURCES = "https://governance.aave.com/\nhttps://status.aave.com/"


@pytest.fixture
def runner():
    r = ContractRunner("contracts/aegis.py")
    r.deploy(args=[ADMIN], account=ADMIN)
    r.write(
        "admin_create_protocol",
        args=["Uniswap", "UNI,Uniswap Protocol", UNISWAP_SOURCES],
        account=ADMIN,
    )
    return r


class TestInitialState:
    def test_admin_address_correct(self, runner):
        admin = runner.call("get_admin")
        assert admin.lower() == ADMIN.lower()

    def test_one_protocol_created(self, runner):
        assert runner.call("get_protocol_count") == 1
        assert runner.call("get_protocol_ids") == [0]

    def test_protocol_summary(self, runner):
        protocols = runner.call("list_protocols")
        assert len(protocols) == 1
        assert protocols[0]["protocol_id"] == 0
        assert protocols[0]["protected_protocol"] == "Uniswap"
        assert protocols[0]["trusted_sources"] == [
            "https://api.llama.fi/tvl/uniswap",
            "https://rekt.news/",
            "https://defillama.com/hacks",
        ]


class TestMultiProtocolProfiles:
    def test_can_create_second_protocol_profile(self, runner):
        runner.write(
            "admin_create_protocol",
            args=["Aave", "AAVE,Aave Protocol", AAVE_SOURCES],
            account=ADMIN,
        )
        assert runner.call("get_protocol_count") == 2
        assert runner.call("get_protocol_ids") == [0, 1]

        aave = runner.call("get_protocol", args=[1])
        assert aave["protected_protocol"] == "Aave"
        assert aave["trusted_sources"] == [
            "https://governance.aave.com/",
            "https://status.aave.com/",
        ]

    def test_protocol_states_are_independent(self, runner):
        runner.write(
            "admin_create_protocol",
            args=["Aave", "AAVE,Aave Protocol", AAVE_SOURCES],
            account=ADMIN,
        )
        runner.write(
            "admin_inject_fake_incident",
            args=[0, 8, "Uniswap exploit simulation", "ui_test"],
            account=ADMIN,
        )

        uniswap = runner.call("get_protocol", args=[0])
        aave = runner.call("get_protocol", args=[1])

        assert uniswap["risk_level"] == 8
        assert uniswap["paused"] is True
        assert aave["risk_level"] == 0
        assert aave["paused"] is False


class TestAdminControls:
    def test_low_risk_incident_does_not_pause(self, runner):
        runner.write(
            "admin_inject_fake_incident",
            args=[0, 3, "Unusual gas spikes", "etherscan"],
            account=ADMIN,
        )
        state = runner.call("get_protocol", args=[0])
        assert state["risk_level"] == 3
        assert state["paused"] is False
        assert state["risk_category"] == "ELEVATED"

    def test_critical_incident_triggers_pause(self, runner):
        runner.write(
            "admin_inject_fake_incident",
            args=[0, 8, "Reentrancy attack detected", "rekt_news"],
            account=ADMIN,
        )
        state = runner.call("get_protocol", args=[0])
        assert state["risk_level"] == 8
        assert state["paused"] is True
        assert state["risk_category"] == "CRITICAL"
        assert state["incident_count"] >= 1

    def test_manual_pause_and_resume(self, runner):
        runner.write(
            "admin_override_pause",
            args=[0, True, "Precautionary pause"],
            account=ADMIN,
        )
        assert runner.call("get_protocol", args=[0])["paused"] is True

        runner.write(
            "admin_override_pause",
            args=[0, False, "Incident resolved"],
            account=ADMIN,
        )
        assert runner.call("get_protocol", args=[0])["paused"] is False

    def test_monitor_toggle_is_per_profile(self, runner):
        runner.write(
            "admin_create_protocol",
            args=["Aave", "AAVE", AAVE_SOURCES],
            account=ADMIN,
        )
        runner.write("admin_set_monitor_enabled", args=[1, False], account=ADMIN)

        assert runner.call("get_protocol", args=[0])["monitor_enabled"] is True
        assert runner.call("get_protocol", args=[1])["monitor_enabled"] is False

    def test_non_admin_is_rejected(self, runner):
        with pytest.raises(Exception, match="Only admin"):
            runner.write(
                "admin_set_risk_level",
                args=[0, 8, "Unauthorized"],
                account="0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            )


class TestSourceManagement:
    def test_admin_can_replace_sources(self, runner):
        runner.write(
            "admin_update_trusted_sources",
            args=[0, "https://status.uniswap.org/\nhttps://blog.uniswap.org/"],
            account=ADMIN,
        )
        assert runner.call("get_trusted_sources", args=[0]) == [
            "https://status.uniswap.org/",
            "https://blog.uniswap.org/",
        ]

    def test_invalid_source_rejected(self, runner):
        with pytest.raises(Exception, match="Source URL must start"):
            runner.write(
                "admin_update_trusted_sources",
                args=[0, "ftp://invalid.example/feed"],
                account=ADMIN,
            )


class TestIncidentLogs:
    def test_log_populates_for_elevated_risk(self, runner):
        runner.write(
            "admin_inject_fake_incident",
            args=[0, 5, "High slippage detected", "defillama"],
            account=ADMIN,
        )
        log = runner.call("get_incident_log", args=[0])
        assert len(log) == 1
        assert log[0]["risk_level"] == 5
        assert "[FAKE TEST]" in log[0]["reason"]

    def test_low_none_risk_does_not_log(self, runner):
        runner.write(
            "admin_inject_fake_incident",
            args=[0, 1, "All systems normal", "routine"],
            account=ADMIN,
        )
        assert runner.call("get_incident_log", args=[0]) == []

    def test_clear_protocol_resets_only_one_profile(self, runner):
        runner.write(
            "admin_create_protocol",
            args=["Aave", "AAVE", AAVE_SOURCES],
            account=ADMIN,
        )
        runner.write("admin_inject_fake_incident", args=[0, 8, "hack", "test"], account=ADMIN)
        runner.write("admin_inject_fake_incident", args=[1, 5, "warning", "test"], account=ADMIN)

        runner.write("admin_clear_protocol", args=[0], account=ADMIN)

        uniswap = runner.call("get_protocol", args=[0])
        aave = runner.call("get_protocol", args=[1])

        assert uniswap["risk_level"] == 0
        assert uniswap["incident_count"] == 0
        assert aave["risk_level"] == 5
        assert aave["incident_count"] == 1
