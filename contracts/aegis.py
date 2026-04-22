# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from dataclasses import dataclass
import json

from genlayer import *


AUTO_PAUSE_THRESHOLD = 7
MAX_INCIDENT_LOG = 20
MAX_PAGE_CHARS = 6000
MAX_REASON_CHARS = 120
ERROR_EXPECTED = "[EXPECTED]"
ERROR_EXTERNAL = "[EXTERNAL]"

TRUSTED_SOURCES = [
    "https://api.llama.fi/tvl/uniswap",
    "https://rekt.news/",
    "https://defillama.com/hacks",
]

RISK_CATEGORIES = {
    0: "NONE",
    1: "NONE",
    2: "NONE",
    3: "ELEVATED",
    4: "ELEVATED",
    5: "HIGH",
    6: "HIGH",
    7: "CRITICAL",
    8: "CRITICAL",
    9: "EMERGENCY",
    10: "EMERGENCY",
}


def derive_category(level: int) -> str:
    return RISK_CATEGORIES.get(level, "UNKNOWN")


def should_pause_from_level(level: int) -> bool:
    return level >= AUTO_PAUSE_THRESHOLD


def sanitize_reason(reason: str, fallback: str) -> str:
    cleaned = reason.strip()
    if cleaned == "":
        cleaned = fallback
    return cleaned[:MAX_REASON_CHARS]


def should_log_incident(level: int, auto_paused: bool, force_log: bool) -> bool:
    if force_log:
        return True
    return level >= 3 or auto_paused


def protocol_tokens(protocol_name: str, aliases_csv: str) -> list:
    tokens = [protocol_name.strip().lower()]
    if aliases_csv.strip() != "":
        for alias in aliases_csv.split(","):
            alias_clean = alias.strip().lower()
            if alias_clean != "":
                tokens.append(alias_clean)

    unique_tokens = []
    for token in tokens:
        if token not in unique_tokens:
            unique_tokens.append(token)
    return unique_tokens


def extract_protocol_context(page_content: str, source_url: str, tokens: list) -> dict:
    lowered_content = page_content.lower()
    lowered_url = source_url.lower()

    for token in tokens:
        content_index = lowered_content.find(token)
        if content_index != -1:
            start = max(0, content_index - 400)
            end = min(len(page_content), content_index + 1400)
            return {
                "mentions_protocol": True,
                "matched_token": token,
                "match_mode": "content",
                "excerpt": page_content[start:end],
            }

    for token in tokens:
        if token in lowered_url:
            return {
                "mentions_protocol": True,
                "matched_token": token,
                "match_mode": "url",
                "excerpt": page_content[:2000],
            }

    return {
        "mentions_protocol": False,
        "matched_token": "",
        "match_mode": "none",
        "excerpt": "",
    }


def parse_prompt_json(raw_response):
    if isinstance(raw_response, str):
        return json.loads(raw_response)
    return raw_response


@allow_storage
@dataclass
class IncidentEntry:
    timestamp: str
    risk_level: u8
    category: str
    reason: str
    source_url: str
    auto_paused: bool


class Aegis(gl.Contract):
    admin: Address
    protected_protocol: str
    protocol_aliases_csv: str
    risk_level: u8
    paused: bool
    pause_reason: str
    last_checked_ts: str
    last_source_url: str
    incident_log: DynArray[IncidentEntry]
    monitor_enabled: bool
    check_count: u256

    def __init__(
        self,
        admin_address: str,
        protected_protocol: str,
        protocol_aliases_csv: str = "",
    ):
        protocol_name = protected_protocol.strip()
        if protocol_name == "":
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Protected protocol is required")

        self.admin = Address(admin_address)
        self.protected_protocol = protocol_name
        self.protocol_aliases_csv = protocol_aliases_csv.strip()
        self.risk_level = u8(0)
        self.paused = False
        self.pause_reason = ""
        self.last_checked_ts = ""
        self.last_source_url = ""
        self.incident_log = []
        self.monitor_enabled = True
        self.check_count = u256(0)

    def _require_admin(self):
        if gl.message.sender_address != self.admin:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Only admin can perform this action")

    def _append_incident(self, entry: IncidentEntry):
        self.incident_log.append(entry)
        while len(self.incident_log) > MAX_INCIDENT_LOG:
            self.incident_log.pop(0)

    @gl.public.view
    def get_risk_level(self) -> int:
        return int(self.risk_level)

    @gl.public.view
    def is_paused(self) -> bool:
        return self.paused

    @gl.public.view
    def can_deposit(self) -> bool:
        return not self.paused

    @gl.public.view
    def get_pause_reason(self) -> str:
        return self.pause_reason

    @gl.public.view
    def get_last_checked(self) -> str:
        return self.last_checked_ts

    @gl.public.view
    def get_risk_category(self) -> str:
        return derive_category(int(self.risk_level))

    @gl.public.view
    def get_protocol_context(self) -> dict:
        return {
            "protected_protocol": self.protected_protocol,
            "protocol_aliases_csv": self.protocol_aliases_csv,
        }

    @gl.public.view
    def get_full_state(self) -> dict:
        level = int(self.risk_level)
        return {
            "protected_protocol": self.protected_protocol,
            "protocol_aliases_csv": self.protocol_aliases_csv,
            "risk_level": level,
            "risk_category": derive_category(level),
            "paused": self.paused,
            "pause_reason": self.pause_reason,
            "last_checked_ts": self.last_checked_ts,
            "last_source_url": self.last_source_url,
            "monitor_enabled": self.monitor_enabled,
            "check_count": int(self.check_count),
            "incident_count": len(self.incident_log),
        }

    @gl.public.view
    def get_incident_log(self) -> list:
        result = []
        for entry in self.incident_log:
            result.append(
                {
                    "timestamp": entry.timestamp,
                    "risk_level": int(entry.risk_level),
                    "category": entry.category,
                    "reason": entry.reason,
                    "source_url": entry.source_url,
                    "auto_paused": entry.auto_paused,
                }
            )
        return result

    @gl.public.view
    def get_trusted_sources(self) -> list:
        return list(TRUSTED_SOURCES)

    @gl.public.view
    def get_admin(self) -> str:
        return format(self.admin)

    @gl.public.write
    def run_risk_check(self, source_url: str):
        if not self.monitor_enabled:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Monitor is disabled by admin")
        if source_url not in TRUSTED_SOURCES:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Source not in whitelist: {source_url}")

        current_check_count = int(self.check_count)
        protected_protocol = str(self.protected_protocol)
        protocol_aliases_csv = str(self.protocol_aliases_csv)
        protocol_token_list = protocol_tokens(protected_protocol, protocol_aliases_csv)
        tx_timestamp = gl.message_raw["datetime"]

        def leader_fn():
            try:
                response = gl.nondet.web.get(source_url)
                page_content = response.body.decode("utf-8", errors="replace")
            except Exception:
                return {
                    "assessment_status": "fetch_error",
                    "mentions_protocol": False,
                    "risk_level": 0,
                    "category": "NONE",
                    "should_pause": False,
                    "reason": "Source fetch failed",
                    "timestamp": tx_timestamp,
                }

            page_excerpt = page_content[:MAX_PAGE_CHARS]
            match_info = extract_protocol_context(page_excerpt, source_url, protocol_token_list)

            if not match_info["mentions_protocol"]:
                return {
                    "assessment_status": "ok",
                    "mentions_protocol": False,
                    "risk_level": 0,
                    "category": "NONE",
                    "should_pause": False,
                    "reason": "No material update about the protected protocol",
                    "timestamp": tx_timestamp,
                }

            prompt = f"""You are evaluating whether a protected DeFi protocol should be placed into emergency deposit-pause mode.

Protected protocol: {protected_protocol}
Matched protocol token: {match_info["matched_token"]}
Match mode: {match_info["match_mode"]}
Source URL: {source_url}

Important rules:
- Only assess risk for the protected protocol named above.
- Ignore hacks, exploits, pauses, governance drama, or TVL changes that are about other protocols.
- If this source does not show clear protocol-specific risk, keep the score low.
- Score 7 or higher only if there is clear evidence of an active exploit, a confirmed incident, an emergency protocol pause, or a severe protocol-specific security event.
- Do not speculate.

Source excerpt:
{match_info["excerpt"]}

Respond with JSON only:
{{
  "risk_level": 0,
  "reason": "One short sentence under 120 characters."
}}"""

            try:
                raw_response = gl.nondet.exec_prompt(prompt, response_format="json")
                parsed = parse_prompt_json(raw_response)
                risk_level = int(parsed.get("risk_level", 0))
                risk_level = max(0, min(10, risk_level))
                reason = sanitize_reason(
                    str(parsed.get("reason", "")),
                    "No confirmed threat found for the protected protocol",
                )
            except (AttributeError, TypeError, ValueError, KeyError, json.JSONDecodeError):
                return {
                    "assessment_status": "llm_error",
                    "mentions_protocol": True,
                    "risk_level": 0,
                    "category": "NONE",
                    "should_pause": False,
                    "reason": "LLM analysis failed",
                    "timestamp": tx_timestamp,
                }

            category = derive_category(risk_level)
            return {
                "assessment_status": "ok",
                "mentions_protocol": True,
                "risk_level": risk_level,
                "category": category,
                "should_pause": should_pause_from_level(risk_level),
                "reason": reason,
                "timestamp": tx_timestamp,
            }

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False

            leader_data = leader_result.calldata
            validator_data = leader_fn()

            if leader_data["assessment_status"] != validator_data["assessment_status"]:
                return False

            if leader_data["assessment_status"] != "ok":
                return True

            return (
                leader_data["mentions_protocol"] == validator_data["mentions_protocol"]
                and leader_data["category"] == validator_data["category"]
                and leader_data["should_pause"] == validator_data["should_pause"]
            )

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        if result["assessment_status"] != "ok":
            raise gl.vm.UserError(f"{ERROR_EXTERNAL} External dependency failed: {result['reason']}")

        new_risk_level = u8(result["risk_level"])
        self.risk_level = new_risk_level
        self.last_checked_ts = result["timestamp"]
        self.last_source_url = source_url
        self.check_count = u256(current_check_count + 1)

        auto_paused = False
        if result["should_pause"] and not self.paused:
            self.paused = True
            self.pause_reason = f"AUTO: {result['category']} - {result['reason']}"
            auto_paused = True

        if should_log_incident(int(new_risk_level), auto_paused, False):
            self._append_incident(
                IncidentEntry(
                    timestamp=result["timestamp"],
                    risk_level=new_risk_level,
                    category=result["category"],
                    reason=result["reason"],
                    source_url=source_url,
                    auto_paused=auto_paused,
                )
            )

    @gl.public.write
    def admin_override_pause(self, should_pause: bool, reason: str):
        self._require_admin()

        self.paused = should_pause
        self.last_checked_ts = gl.message_raw["datetime"]

        if should_pause:
            clean_reason = sanitize_reason(reason, "Manual pause")
            self.pause_reason = f"MANUAL: {clean_reason}"
            self._append_incident(
                IncidentEntry(
                    timestamp=gl.message_raw["datetime"],
                    risk_level=u8(int(self.risk_level)),
                    category="MANUAL_PAUSE",
                    reason=clean_reason,
                    source_url="admin_override",
                    auto_paused=False,
                )
            )
        else:
            clean_reason = sanitize_reason(reason, "Manual unpause")
            self.pause_reason = f"MANUAL UNPAUSE: {clean_reason}"

    @gl.public.write
    def admin_set_monitor_enabled(self, enabled: bool):
        self._require_admin()
        self.monitor_enabled = enabled

    @gl.public.write
    def admin_update_protocol_context(self, protected_protocol: str, protocol_aliases_csv: str = ""):
        self._require_admin()

        protocol_name = protected_protocol.strip()
        if protocol_name == "":
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Protected protocol is required")

        self.protected_protocol = protocol_name
        self.protocol_aliases_csv = protocol_aliases_csv.strip()

    @gl.public.write
    def admin_set_risk_level(self, level: int, reason: str):
        self._require_admin()
        if level < 0 or level > 10:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Risk level must be 0-10")

        category = derive_category(level)
        clean_reason = sanitize_reason(reason, "Admin risk override")

        self.risk_level = u8(level)
        self.last_checked_ts = gl.message_raw["datetime"]

        auto_paused = False
        if should_pause_from_level(level) and not self.paused:
            self.paused = True
            self.pause_reason = f"ADMIN SET: {category} - {clean_reason}"
            auto_paused = True

        if should_log_incident(level, auto_paused, False):
            self._append_incident(
                IncidentEntry(
                    timestamp=gl.message_raw["datetime"],
                    risk_level=u8(level),
                    category=category,
                    reason=clean_reason,
                    source_url="admin_set_risk",
                    auto_paused=auto_paused,
                )
            )

    @gl.public.write
    def admin_inject_fake_incident(self, risk_level: int, reason: str, source_label: str):
        self._require_admin()
        if risk_level < 0 or risk_level > 10:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Risk level must be 0-10")

        category = derive_category(risk_level)
        clean_reason = sanitize_reason(f"[FAKE TEST] {reason}", "[FAKE TEST] Manual simulation")
        fake_source = f"fake:{source_label.strip() or 'test'}"

        self.risk_level = u8(risk_level)
        self.last_checked_ts = gl.message_raw["datetime"]
        self.last_source_url = fake_source

        auto_paused = False
        if should_pause_from_level(risk_level) and not self.paused:
            self.paused = True
            self.pause_reason = f"AUTO(FAKE): {category} - {clean_reason}"
            auto_paused = True

        if should_log_incident(risk_level, auto_paused, False):
            self._append_incident(
                IncidentEntry(
                    timestamp=gl.message_raw["datetime"],
                    risk_level=u8(risk_level),
                    category=category,
                    reason=clean_reason,
                    source_url=fake_source,
                    auto_paused=auto_paused,
                )
            )

        self.check_count = u256(int(self.check_count) + 1)

    @gl.public.write
    def admin_clear_log(self):
        self._require_admin()
        self.incident_log.clear()
        self.risk_level = u8(0)
        self.paused = False
        self.pause_reason = ""
        self.last_checked_ts = ""
        self.last_source_url = ""
        self.check_count = u256(0)
