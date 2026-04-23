"""
Tests using live web sources.
Run with: pytest -m real tests/test_aegis_real.py -v -s
"""
import pytest
from genlayer_test import ContractRunner

ADMIN = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
UNISWAP_SOURCES = "https://api.llama.fi/tvl/uniswap\nhttps://rekt.news/\nhttps://defillama.com/hacks"


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


@pytest.mark.real
class TestRealWebSources:
    def test_run_check_defillama_api(self, runner):
        runner.write(
            "run_risk_check",
            args=[0, "https://api.llama.fi/tvl/uniswap"],
            account=ADMIN,
        )
        state = runner.call("get_protocol", args=[0])
        assert 0 <= state["risk_level"] <= 6
        assert state["last_source_url"] == "https://api.llama.fi/tvl/uniswap"

    def test_run_check_rekt_news(self, runner):
        runner.write(
            "run_risk_check",
            args=[0, "https://rekt.news/"],
            account=ADMIN,
        )
        state = runner.call("get_protocol", args=[0])
        assert 0 <= state["risk_level"] <= 10
        assert state["last_source_url"] == "https://rekt.news/"

    def test_untrusted_source_rejected(self, runner):
        with pytest.raises(Exception, match="Source not in whitelist"):
            runner.write(
                "run_risk_check",
                args=[0, "https://evil-phishing-site.com/hack"],
                account=ADMIN,
            )
