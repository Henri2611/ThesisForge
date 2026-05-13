import logging
from typing import Any
from tree_sitter import Language, Parser
import tree_sitter_python as tspython
import tree_sitter_typescript as ts
import tree_sitter_javascript as js
import tree_sitter_go as go
import tree_sitter_java as java

from schemas.repo import Symbol

logger = logging.getLogger(__name__)

# Load languages
LANGUAGES = {
    "python": Language(tspython.language()),
    "typescript": Language(ts.language_typescript()),
    "tsx": Language(ts.language_tsx()),
    "javascript": Language(js.language()),
    "go": Language(go.language()),
    "java": Language(java.language()),
}

class ASTParser:
    def __init__(self):
        self._parsers: dict[str, Parser] = {}
        for lang_name, lang_obj in LANGUAGES.items():
            parser = Parser(lang_obj)
            self._parsers[lang_name] = parser

    def parse(self, content: str, language: str) -> list[Symbol]:
        if language not in self._parsers:
            return []

        parser = self._parsers[language]
        tree = parser.parse(bytes(content, "utf8"))
        
        symbols: list[Symbol] = []
        self._traverse_tree(tree.root_node, symbols, language)
        return symbols

    def _traverse_tree(self, node: Any, symbols: list[Symbol], language: str):
        # Python specific node types
        if language == "python":
            if node.type == "function_definition":
                name_node = node.child_by_field_name("name")
                if name_node:
                    symbols.append(Symbol(
                        name=name_node.text.decode("utf8"),
                        kind="function",
                        line=node.start_point[0] + 1
                    ))
            elif node.type == "class_definition":
                name_node = node.child_by_field_name("name")
                if name_node:
                    symbols.append(Symbol(
                        name=name_node.text.decode("utf8"),
                        kind="class",
                        line=node.start_point[0] + 1
                    ))

        # TypeScript / JavaScript specific node types
        elif language in ["typescript", "javascript", "tsx"]:
            if node.type in ["function_declaration", "method_definition"]:
                name_node = node.child_by_field_name("name")
                if name_node:
                    symbols.append(Symbol(
                        name=name_node.text.decode("utf8"),
                        kind="function",
                        line=node.start_point[0] + 1
                    ))
            elif node.type == "class_declaration":
                name_node = node.child_by_field_name("name")
                if name_node:
                    symbols.append(Symbol(
                        name=name_node.text.decode("utf8"),
                        kind="class",
                        line=node.start_point[0] + 1
                    ))
            elif node.type == "variable_declarator":
                # Handle arrow functions assigned to variables: const x = () => {}
                name_node = node.child_by_field_name("name")
                value_node = node.child_by_field_name("value")
                if name_node and value_node and value_node.type == "arrow_function":
                    symbols.append(Symbol(
                        name=name_node.text.decode("utf8"),
                        kind="function",
                        line=node.start_point[0] + 1
                    ))

        # Go specific node types
        elif language == "go":
            if node.type == "function_declaration":
                name_node = node.child_by_field_name("name")
                if name_node:
                    symbols.append(Symbol(
                        name=name_node.text.decode("utf8"),
                        kind="function",
                        line=node.start_point[0] + 1
                    ))
            elif node.type == "type_declaration":
                # Look for struct types
                for child in node.children:
                    if child.type == "type_spec":
                        name_node = child.child_by_field_name("name")
                        type_node = child.child_by_field_name("type")
                        if name_node and type_node and type_node.type == "struct_type":
                            symbols.append(Symbol(
                                name=name_node.text.decode("utf8"),
                                kind="struct",
                                line=node.start_point[0] + 1
                            ))

        # Java specific node types
        elif language == "java":
            if node.type == "method_declaration":
                name_node = node.child_by_field_name("name")
                if name_node:
                    symbols.append(Symbol(
                        name=name_node.text.decode("utf8"),
                        kind="method",
                        line=node.start_point[0] + 1
                    ))
            elif node.type in ["class_declaration", "interface_declaration"]:
                name_node = node.child_by_field_name("name")
                if name_node:
                    symbols.append(Symbol(
                        name=name_node.text.decode("utf8"),
                        kind="class" if node.type == "class_declaration" else "interface",
                        line=node.start_point[0] + 1
                    ))

        # Imports — all languages
        if node.type in ("import_statement", "import_from_statement"):
            symbols.append(Symbol(
                name=node.text.decode("utf8"),
                kind="import",
                line=node.start_point[0] + 1
            ))
        elif language in ("typescript", "javascript", "tsx") and node.type == "import_declaration":
            symbols.append(Symbol(
                name=node.text.decode("utf8"),
                kind="import",
                line=node.start_point[0] + 1
            ))
        elif language == "go" and node.type == "import_declaration":
            symbols.append(Symbol(
                name=node.text.decode("utf8"),
                kind="import",
                line=node.start_point[0] + 1
            ))
        elif language == "java" and node.type == "import_declaration":
            symbols.append(Symbol(
                name=node.text.decode("utf8"),
                kind="import",
                line=node.start_point[0] + 1
            ))

        for child in node.children:
            self._traverse_tree(child, symbols, language)
