import re
from schemas.repo import Symbol


class RegexParser:
    PATTERNS: dict[str, list[tuple[str, str]]] = {
        "python": [
            ("function", r"^\s*async\s+def\s+(\w+)\s*\("),
            ("function", r"^\s*def\s+(\w+)\s*\("),
            ("class", r"^\s*class\s+(\w+)"),
            ("import", r"^\s*import\s+(\S+)"),
            ("import", r"^\s*from\s+(\S+)\s+import"),
        ],
        "javascript": [
            ("function", r"(?:async\s+)?function\s+(\w+)\s*\("),
            ("function", r"(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>"),
            ("function", r"(\w+)\s*:\s*(?:async\s*)?function\s*\("),
            ("class", r"class\s+(\w+)"),
            ("import", r"import\s+\{?\s*(\w+)"),
            ("import", r"require\(['\"]([^'\"]+)['\"]\)"),
        ],
        "typescript": [
            ("function", r"(?:async\s+)?function\s+(\w+)\s*\("),
            ("function", r"(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>"),
            ("function", r"(?:public|private|protected)?\s*(\w+)\s*\([^)]*\)\s*:"),
            ("class", r"class\s+(\w+)"),
            ("interface", r"interface\s+(\w+)"),
            ("type", r"type\s+(\w+)\s*="),
            ("import", r"import\s+\{?\s*(\w+)"),
            ("import", r"import\s+type\s+\{?\s*(\w+)"),
        ],
        "java": [
            ("class", r"(?:public|private|abstract|final)?\s*(?:class|interface|enum)\s+(\w+)"),
            ("method", r"(?:public|private|protected|static|\s)*\s+(\w+(?:\[\])?)\s+(\w+)\s*\("),
            ("import", r"^\s*import\s+(?:static\s+)?(\S+);"),
        ],
        "go": [
            ("function", r"^\s*func\s+(\w+)\s*\("),
            ("function", r"^\s*func\s+\([^)]+\)\s+(\w+)\s*\("),
            ("struct", r"^\s*type\s+(\w+)\s+struct"),
            ("interface", r"^\s*type\s+(\w+)\s+interface"),
            ("import", r"^\s*import\s+\"(\S+)\""),
        ],
        "rust": [
            ("function", r"^\s*(?:pub\s+)?(?:async\s+)?fn\s+(\w+)\s*\("),
            ("struct", r"^\s*(?:pub\s+)?struct\s+(\w+)"),
            ("enum", r"^\s*(?:pub\s+)?enum\s+(\w+)"),
            ("trait", r"^\s*(?:pub\s+)?trait\s+(\w+)"),
            ("import", r"^\s*use\s+(\S+);"),
        ],
        "ruby": [
            ("method", r"^\s*(?:def\s+(?:self\.)?(\w+))"),
            ("class", r"^\s*(?:class\s+(\w+))"),
            ("module", r"^\s*(?:module\s+(\w+))"),
            ("import", r"^\s*require\s+['\"](\S+)['\"]"),
        ],
        "c": [
            ("function", r"^\s*(?:\w+\s+)+\*?(\w+)\s*\([^)]*\)\s*\{?"),
            ("function", r"^\s*static\s+(?:\w+\s+)+\*?(\w+)\s*\([^)]*\)\s*\{?"),
            ("struct", r"^\s*(?:typedef\s+)?struct\s+(\w+)"),
            ("import", r"^\s*#\s*include\s+[<\"]([^>\"]+)[>\"]"),
        ],
        "cpp": [
            ("function", r"^\s*(?:\w+\s+)+\*?(\w+)\s*\([^)]*\)\s*\{?"),
            ("class", r"^\s*(?:class|struct)\s+(\w+)"),
            ("import", r"^\s*#\s*include\s+[<\"]([^>\"]+)[>\"]"),
            ("import", r"^\s*using\s+namespace\s+(\w+);"),
        ],
        "c_sharp": [
            ("class", r"^\s*(?:public|private|internal|abstract|sealed|static)?\s*(?:class|struct|interface|enum|record)\s+(\w+)"),
            ("method", r"^\s*(?:public|private|internal|protected|static|virtual|override|async)?\s*(?:\w+\s+)+(\w+)\s*\([^)]*\)\s*\{?"),
            ("import", r"^\s*using\s+(\S+);"),
        ],
    }

    def parse(self, content: str, language: str) -> list[Symbol]:
        symbols: list[Symbol] = []
        patterns = self.PATTERNS.get(language, [])
        lines = content.split("\n")
        for kind, pattern in patterns:
            for i, line in enumerate(lines, 1):
                m = re.search(pattern, line)
                if m:
                    name = m.group(1).strip()
                    if name:
                        symbols.append(Symbol(name=name, kind=kind, line=i))
        return symbols
