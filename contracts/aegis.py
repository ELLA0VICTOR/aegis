# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from dataclasses import dataclass
import json

from genlayer import *


AUTO_PAUSE_THRESHOLD = 7
MAX_INCIDENT_LOG = 20
MAX_PAGE_CHARS = 6000
MAX_REASON_CHARS = 120
MAX_PROTOCOL_NAME_CHARS = 80
MAX_PROTOCOL_ALIASES_CHARS = 240
MAX_TRUSTED_SOURCES = 12
MAX_SOURCE_URL_CHARS = 220
ERROR_EXPECTED = "[EXPECTED]"
ERROR_EXTERNAL = "[EXTERNAL]"

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


def sanitize_protocol_name(protocol_name: str) -> str:
    cleaned = protocol_name.strip()
    if cleaned == "":
        raise gl.vm.UserError(f"{ERROR_EXPECTED} Protected protocol is required")
    return cleaned[:MAX_PROTOCOL_NAME_CHARS]


def sanitize_protocol_aliases(aliases_csv: str) -> str:
    return aliases_csv.strip()[:MAX_PROTOCOL_ALIASES_CHARS]


def parse_trusted_sources_text(sources_text: str) -> list:
    normalized = []
    raw_sources = sources_text.replace("\n", ",").split(",")

    for raw_source in raw_sources:
        candidate = raw_source.strip()
        if candidate == "":
            continue
        if candidate not in normalized:
            normalized.append(candidate)

    return normalized


def validate_trusted_sources(sources: list) -> list:
    if len(sources) == 0:
        raise gl.vm.UserError(f"{ERROR_EXPECTED} At least one trusted source is required")
    if len(sources) > MAX_TRUSTED_SOURCES:
        raise gl.vm.UserError(
            f"{ERROR_EXPECTED} Too many trusted sources; max is {MAX_TRUSTED_SOURCES}"
        )

    for source in sources:
        if len(source) > MAX_SOURCE_URL_CHARS:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Source URL too long: {source}")
        if " " in source:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Source URL cannot contain spaces: {source}")
        if not (source.startswith("https://") or source.startswith("http://")):
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} Source URL must start with http:// or https://: {source}"
            )

    return sources


def serialize_trusted_sources(sources: list) -> str:
    return "\n".join(sources)


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


@allow_storage
@dataclass
class ProtocolProfile:
    id: u256
    protected_protocol: str
    protocol_aliases_csv: str
    trusted_sources_csv: str
    risk_level: u8
    paused: bool
    pause_reason: str
    last_checked_ts: str
    last_source_url: str
    monitor_enabled: bool
    check_count: u256


class Aegis(gl.Contract):
    admin: Address
    profiles: TreeMap[u256, ProtocolProfile]
    incident_logs: TreeMap[u256, DynArray[IncidentEntry]]
    protocol_ids: DynArray[u256]
    next_protocol_id: u256

    def __init__(self, admin_address: str):
        self.admin = Address(admin_address)
        self.protocol_ids = []
        self.next_protocol_id = u256(0)

    def _require_admin(self):
        if gl.message.sender_address != self.admin:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Only admin can perform this action")

    def _to_protocol_key(self, profile_id: int) -> u256:
        key = u256(profile_id)
        if key not in self.profiles:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Protocol profile does not exist")
        return key

    def _get_incident_log_storage(self, profile_key: u256) -> DynArray[IncidentEntry]:
        if profile_key in self.incident_logs:
            return self.incident_logs[profile_key]
        return []

    def _get_trusted_sources_list(self, profile: ProtocolProfile) -> list:
        return parse_trusted_sources_text(profile.trusted_sources_csv)

    def _set_trusted_sources(self, profile: ProtocolProfile, trusted_sources_text: str):
        trusted_sources = validate_trusted_sources(
            parse_trusted_sources_text(trusted_sources_text)
        )
        profile.trusted_sources_csv = serialize_trusted_sources(trusted_sources)

    def _build_profile_state(self, profile: ProtocolProfile, incident_count: int) -> dict:
        level = int(profile.risk_level)
        return {
            "protocol_id": int(profile.id),
            "protected_protocol": profile.protected_protocol,
            "protocol_aliases_csv": profile.protocol_aliases_csv,
            "risk_level": level,
            "risk_category": derive_category(level),
            "paused": profile.paused,
            "pause_reason": profile.pause_reason,
            "last_checked_ts": profile.last_checked_ts,
            "last_source_url": profile.last_source_url,
            "monitor_enabled": profile.monitor_enabled,
            "check_count": int(profile.check_count),
            "incident_count": incident_count,
            "trusted_sources": self._get_trusted_sources_list(profile),
        }

    def _append_incident(self, profile_key: u256, entry: IncidentEntry):
        log_entries = self._get_incident_log_storage(profile_key)
        log_entries.append(entry)
        while len(log_entries) > MAX_INCIDENT_LOG:
            log_entries.pop(0)
        self.incident_logs[profile_key] = log_entries

    @gl.public.view
    def get_admin(self) -> str:
        return format(self.admin)

    @gl.public.view
    def get_protocol_count(self) -> int:
        return len(self.protocol_ids)

    @gl.public.view
    def get_protocol_ids(self) -> list:
        result = []
        for profile_id in self.protocol_ids:
            result.append(int(profile_id))
        return result

    @gl.public.view
    def list_protocols(self) -> list:
        result = []
        for profile_id in self.protocol_ids:
            profile = self.profiles[profile_id]
            result.append(
                self._build_profile_state(
                    profile,
                    len(self._get_incident_log_storage(profile_id)),
                )
            )
        return result

    @gl.public.view
    def get_protocol(self, profile_id: int) -> dict:
        profile_key = self._to_protocol_key(profile_id)
        profile = self.profiles[profile_key]
        return self._build_profile_state(
            profile,
            len(self._get_incident_log_storage(profile_key)),
        )

    @gl.public.view
    def get_incident_log(self, profile_id: int) -> list:
        profile_key = self._to_protocol_key(profile_id)
        result = []
        for entry in self._get_incident_log_storage(profile_key):
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
    def get_trusted_sources(self, profile_id: int) -> list:
        profile_key = self._to_protocol_key(profile_id)
        return self._get_trusted_sources_list(self.profiles[profile_key])

    @gl.public.write
    def admin_create_protocol(
        self,
        protected_protocol: str,
        protocol_aliases_csv: str,
        trusted_sources_text: str,
    ):
        self._require_admin()

        profile_id = self.next_protocol_id
        protocol_name = sanitize_protocol_name(protected_protocol)
        aliases = sanitize_protocol_aliases(protocol_aliases_csv)
        trusted_sources = validate_trusted_sources(
            parse_trusted_sources_text(trusted_sources_text)
        )

        self.profiles[profile_id] = ProtocolProfile(
            id=profile_id,
            protected_protocol=protocol_name,
            protocol_aliases_csv=aliases,
            trusted_sources_csv=serialize_trusted_sources(trusted_sources),
            risk_level=u8(0),
            paused=False,
            pause_reason="",
            last_checked_ts="",
            last_source_url="",
            monitor_enabled=True,
            check_count=u256(0),
        )
        self.incident_logs[profile_id] = []
        self.protocol_ids.append(profile_id)
        self.next_protocol_id = u256(int(self.next_protocol_id) + 1)

    @gl.public.write
    def admin_update_protocol_context(
        self,
        profile_id: int,
        protected_protocol: str,
        protocol_aliases_csv: str = "",
    ):
        self._require_admin()
        profile_key = self._to_protocol_key(profile_id)
        profile = self.profiles[profile_key]

        profile.protected_protocol = sanitize_protocol_name(protected_protocol)
        profile.protocol_aliases_csv = sanitize_protocol_aliases(protocol_aliases_csv)

        self.profiles[profile_key] = profile

    @gl.public.write
    def admin_update_trusted_sources(self, profile_id: int, trusted_sources_text: str):
        self._require_admin()
        profile_key = self._to_protocol_key(profile_id)
        profile = self.profiles[profile_key]
        self._set_trusted_sources(profile, trusted_sources_text)
        self.profiles[profile_key] = profile

    @gl.public.write
    def admin_set_monitor_enabled(self, profile_id: int, enabled: bool):
        self._require_admin()
        profile_key = self._to_protocol_key(profile_id)
        profile = self.profiles[profile_key]
        profile.monitor_enabled = enabled
        self.profiles[profile_key] = profile

    @gl.public.write
    def run_risk_check(self, profile_id: int, source_url: str):
        profile_key = self._to_protocol_key(profile_id)
        profile = self.profiles[profile_key]

        if not profile.monitor_enabled:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Monitor is disabled by admin")

        trusted_sources = self._get_trusted_sources_list(profile)
        if source_url not in trusted_sources:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Source not in whitelist: {source_url}")

        current_check_count = int(profile.check_count)
        protected_protocol = str(profile.protected_protocol)
        protocol_aliases_csv = str(profile.protocol_aliases_csv)
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
        profile.risk_level = new_risk_level
        profile.last_checked_ts = result["timestamp"]
        profile.last_source_url = source_url
        profile.check_count = u256(current_check_count + 1)

        auto_paused = False
        if result["should_pause"] and not profile.paused:
            profile.paused = True
            profile.pause_reason = f"AUTO: {result['category']} - {result['reason']}"
            auto_paused = True

        if should_log_incident(int(new_risk_level), auto_paused, False):
            self._append_incident(
                profile_key,
                IncidentEntry(
                    timestamp=result["timestamp"],
                    risk_level=new_risk_level,
                    category=result["category"],
                    reason=result["reason"],
                    source_url=source_url,
                    auto_paused=auto_paused,
                ),
            )

        self.profiles[profile_key] = profile

    @gl.public.write
    def admin_override_pause(self, profile_id: int, should_pause: bool, reason: str):
        self._require_admin()
        profile_key = self._to_protocol_key(profile_id)
        profile = self.profiles[profile_key]

        profile.paused = should_pause
        profile.last_checked_ts = gl.message_raw["datetime"]

        if should_pause:
            clean_reason = sanitize_reason(reason, "Manual pause")
            profile.pause_reason = f"MANUAL: {clean_reason}"
            self._append_incident(
                profile_key,
                IncidentEntry(
                    timestamp=gl.message_raw["datetime"],
                    risk_level=u8(int(profile.risk_level)),
                    category="MANUAL_PAUSE",
                    reason=clean_reason,
                    source_url="admin_override",
                    auto_paused=False,
                ),
            )
        else:
            clean_reason = sanitize_reason(reason, "Manual unpause")
            profile.pause_reason = f"MANUAL UNPAUSE: {clean_reason}"

        self.profiles[profile_key] = profile

    @gl.public.write
    def admin_set_risk_level(self, profile_id: int, level: int, reason: str):
        self._require_admin()
        if level < 0 or level > 10:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Risk level must be 0-10")

        profile_key = self._to_protocol_key(profile_id)
        profile = self.profiles[profile_key]
        category = derive_category(level)
        clean_reason = sanitize_reason(reason, "Admin risk override")

        profile.risk_level = u8(level)
        profile.last_checked_ts = gl.message_raw["datetime"]

        auto_paused = False
        if should_pause_from_level(level) and not profile.paused:
            profile.paused = True
            profile.pause_reason = f"ADMIN SET: {category} - {clean_reason}"
            auto_paused = True

        if should_log_incident(level, auto_paused, False):
            self._append_incident(
                profile_key,
                IncidentEntry(
                    timestamp=gl.message_raw["datetime"],
                    risk_level=u8(level),
                    category=category,
                    reason=clean_reason,
                    source_url="admin_set_risk",
                    auto_paused=auto_paused,
                ),
            )

        self.profiles[profile_key] = profile

    @gl.public.write
    def admin_inject_fake_incident(
        self,
        profile_id: int,
        risk_level: int,
        reason: str,
        source_label: str,
    ):
        self._require_admin()
        if risk_level < 0 or risk_level > 10:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Risk level must be 0-10")

        profile_key = self._to_protocol_key(profile_id)
        profile = self.profiles[profile_key]
        category = derive_category(risk_level)
        clean_reason = sanitize_reason(f"[FAKE TEST] {reason}", "[FAKE TEST] Manual simulation")
        fake_source = f"fake:{source_label.strip() or 'test'}"

        profile.risk_level = u8(risk_level)
        profile.last_checked_ts = gl.message_raw["datetime"]
        profile.last_source_url = fake_source

        auto_paused = False
        if should_pause_from_level(risk_level) and not profile.paused:
            profile.paused = True
            profile.pause_reason = f"AUTO(FAKE): {category} - {clean_reason}"
            auto_paused = True

        if should_log_incident(risk_level, auto_paused, False):
            self._append_incident(
                profile_key,
                IncidentEntry(
                    timestamp=gl.message_raw["datetime"],
                    risk_level=u8(risk_level),
                    category=category,
                    reason=clean_reason,
                    source_url=fake_source,
                    auto_paused=auto_paused,
                ),
            )

        profile.check_count = u256(int(profile.check_count) + 1)
        self.profiles[profile_key] = profile

    @gl.public.write
    def admin_clear_protocol(self, profile_id: int):
        self._require_admin()
        profile_key = self._to_protocol_key(profile_id)
        profile = self.profiles[profile_key]

        self.incident_logs[profile_key] = []
        profile.risk_level = u8(0)
        profile.paused = False
        profile.pause_reason = ""
        profile.last_checked_ts = ""
        profile.last_source_url = ""
        profile.check_count = u256(0)

        self.profiles[profile_key] = profile
