"""
Tests using fake incident injection — no live web calls required.
Run with: pytest tests/test_aegis_fake.py -v
"""
import pytest
from genlayer_test import ContractRunner  # genlayer test framework

ADMIN = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
PROTECTED_PROTOCOL = "Uniswap"
PROTOCOL_ALIASES = "UNI,Uniswap Protocol"


@pytest.fixture
def runner():
    """Deploy a fresh Aegis contract for each test."""
    r = ContractRunner("contracts/aegis.py")
    r.deploy(args=[ADMIN, PROTECTED_PROTOCOL, PROTOCOL_ALIASES], account=ADMIN)
    return r


class TestInitialState:
    def test_initial_risk_level_is_zero(self, runner):
        assert runner.call("get_risk_level") == 0

    def test_initial_not_paused(self, runner):
        assert runner.call("is_paused") == False

    def test_can_deposit_initially(self, runner):
        assert runner.call("can_deposit") == True

    def test_admin_address_correct(self, runner):
        admin = runner.call("get_admin")
        assert admin.lower() == ADMIN.lower()

    def test_protocol_context_saved(self, runner):
        context = runner.call("get_protocol_context")
        assert context["protected_protocol"] == PROTECTED_PROTOCOL
        assert context["protocol_aliases_csv"] == PROTOCOL_ALIASES


class TestFakeIncidentInjection:
    def test_inject_low_risk_no_pause(self, runner):
        runner.write(
            "admin_inject_fake_incident",
            args=[3, "Unusual gas spikes on monitored contract", "etherscan"],
            account=ADMIN
        )
        state = runner.call("get_full_state")
        assert state["risk_level"] == 3
        assert state["paused"] == False
        assert state["risk_category"] == "ELEVATED"

    def test_inject_critical_triggers_auto_pause(self, runner):
        runner.write(
            "admin_inject_fake_incident",
            args=[8, "Reentrancy attack detected in withdraw()", "rekt_news"],
            account=ADMIN
        )
        state = runner.call("get_full_state")
        assert state["risk_level"] == 8
        assert state["paused"] == True
        assert state["risk_category"] == "CRITICAL"
        assert state["incident_count"] >= 1

    def test_inject_emergency_level_10(self, runner):
        runner.write(
            "admin_inject_fake_incident",
            args=[10, "Protocol drained: $50M in flash loan attack", "hack_alert"],
            account=ADMIN
        )
        state = runner.call("get_full_state")
        assert state["risk_level"] == 10
        assert state["paused"] == True
        assert state["risk_category"] == "EMERGENCY"

    def test_can_deposit_false_when_paused(self, runner):
        runner.write(
            "admin_inject_fake_incident",
            args=[9, "Exploit in progress", "test"],
            account=ADMIN
        )
        assert runner.call("can_deposit") == False


class TestAdminOverride:
    def test_manual_pause(self, runner):
        runner.write(
            "admin_override_pause",
            args=[True, "Precautionary pause for maintenance"],
            account=ADMIN
        )
        assert runner.call("is_paused") == True
        reason = runner.call("get_pause_reason")
        assert "MANUAL" in reason

    def test_manual_unpause(self, runner):
        # First pause
        runner.write("admin_inject_fake_incident", args=[9, "test", "test"], account=ADMIN)
        assert runner.call("is_paused") == True

        # Then unpause
        runner.write(
            "admin_override_pause",
            args=[False, "Incident resolved, safe to resume"],
            account=ADMIN
        )
        assert runner.call("is_paused") == False

    def test_non_admin_cannot_pause(self, runner):
        with pytest.raises(Exception, match="Only admin"):
            runner.write(
                "admin_override_pause",
                args=[True, "Unauthorized pause attempt"],
                account="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"  # not admin
            )

    def test_non_admin_cannot_inject(self, runner):
        with pytest.raises(Exception, match="Only admin"):
            runner.write(
                "admin_inject_fake_incident",
                args=[10, "hack", "test"],
                account="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
            )


class TestIncidentLog:
    def test_log_populated_on_elevated_risk(self, runner):
        runner.write(
            "admin_inject_fake_incident",
            args=[5, "High slippage detected on main pool", "defillama"],
            account=ADMIN
        )
        log = runner.call("get_incident_log")
        assert len(log) == 1
        assert log[0]["risk_level"] == 5
        assert "[FAKE TEST]" in log[0]["reason"]

    def test_log_not_populated_on_none_risk(self, runner):
        runner.write(
            "admin_inject_fake_incident",
            args=[1, "All systems normal", "routine"],
            account=ADMIN
        )
        log = runner.call("get_incident_log")
        assert len(log) == 0

    def test_admin_clear_log(self, runner):
        runner.write("admin_inject_fake_incident", args=[8, "hack", "test"], account=ADMIN)
        assert len(runner.call("get_incident_log")) > 0
        runner.write("admin_clear_log", args=[], account=ADMIN)
        assert len(runner.call("get_incident_log")) == 0
        assert runner.call("get_risk_level") == 0
        assert runner.call("is_paused") == False


class TestAdminSetRiskLevel:
    def test_admin_set_risk_level_5(self, runner):
        runner.write("admin_set_risk_level", args=[5, "Manual high alert"], account=ADMIN)
        assert runner.call("get_risk_level") == 5
        assert runner.call("is_paused") == False

    def test_admin_set_risk_level_7_pauses(self, runner):
        runner.write("admin_set_risk_level", args=[7, "Admin triggered critical"], account=ADMIN)
        assert runner.call("get_risk_level") == 7
        assert runner.call("is_paused") == True
