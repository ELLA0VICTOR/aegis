"""
Tests using live web sources.
ONLY run these when you want to test real internet connectivity.
Skip in CI: pytest tests/test_aegis_real.py --ignore or use -m "not real"

Mark: pytest -m real tests/test_aegis_real.py -v -s
"""
import pytest
from genlayer_test import ContractRunner

ADMIN = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
PROTECTED_PROTOCOL = "Uniswap"
PROTOCOL_ALIASES = "UNI,Uniswap Protocol"


@pytest.fixture
def runner():
    r = ContractRunner("contracts/aegis.py")
    r.deploy(args=[ADMIN, PROTECTED_PROTOCOL, PROTOCOL_ALIASES], account=ADMIN)
    return r


@pytest.mark.real
class TestRealWebSources:
    def test_run_check_defillama_api(self, runner):
        """
        Fetch DeFiLlama's TVL API for Uniswap.
        This should return a numeric JSON response — risk should be NONE/ELEVATED.
        """
        runner.write(
            "run_risk_check",
            args=["https://api.llama.fi/tvl/uniswap"],
            account=ADMIN
        )
        state = runner.call("get_full_state")
        # Real monitoring: risk should be 0-4 on a normal day
        assert 0 <= state["risk_level"] <= 6, (
            f"Unexpected risk from DeFiLlama: {state['risk_level']} — "
            f"reason: {runner.call('get_pause_reason') or 'none'}"
        )
        print(f"\n✅ DeFiLlama check: risk_level={state['risk_level']}, "
              f"category={state['risk_category']}")

    @pytest.mark.real
    def test_run_check_rekt_news(self, runner):
        """
        Fetch Rekt News. If there's a recent major hack, risk might be elevated.
        We just verify the contract runs without error and produces valid output.
        """
        runner.write(
            "run_risk_check",
            args=["https://rekt.news/"],
            account=ADMIN
        )
        state = runner.call("get_full_state")
        assert 0 <= state["risk_level"] <= 10
        assert state["last_source_url"] == "https://rekt.news/"
        print(f"\n✅ Rekt.news check: risk_level={state['risk_level']}, "
              f"category={state['risk_category']}, "
              f"reason={state}")

    @pytest.mark.real
    def test_untrusted_source_rejected(self, runner):
        """
        Any URL NOT in the whitelist must be rejected.
        """
        with pytest.raises(Exception, match="Source not in whitelist"):
            runner.write(
                "run_risk_check",
                args=["https://evil-phishing-site.com/hack"],
                account=ADMIN
            )
