"""Tests for the AST parser — verifies symbol extraction across languages."""


class TestPythonAST:
    def test_parse_function(self, ast_parser):
        code = "def hello():\n    print('world')"
        symbols = ast_parser.parse(code, "python")
        assert len(symbols) >= 1
        fn = next(s for s in symbols if s.kind == "function")
        assert fn.name == "hello"
        assert fn.line == 1

    def test_parse_class(self, ast_parser):
        code = """class MyClass:
    def method(self):
        pass
"""
        symbols = ast_parser.parse(code, "python")
        classes = [s for s in symbols if s.kind == "class"]
        assert len(classes) == 1
        assert classes[0].name == "MyClass"
        assert classes[0].line == 1

    def test_class_with_methods(self, ast_parser):
        code = """class Calculator:
    def add(self, a, b):
        return a + b
    def subtract(self, a, b):
        return a - b
"""
        symbols = ast_parser.parse(code, "python")
        classes = [s for s in symbols if s.kind == "class"]
        functions = [s for s in symbols if s.kind == "function"]
        assert len(classes) == 1
        assert classes[0].name == "Calculator"
        assert len(functions) == 2

    def test_import_detection(self, ast_parser):
        code = "import os\nfrom pathlib import Path\n"
        symbols = ast_parser.parse(code, "python")
        imports = [s for s in symbols if s.kind == "import"]
        assert len(imports) >= 2

    def test_async_function(self, ast_parser):
        code = "async def fetch_data():\n    return await get()\n"
        symbols = ast_parser.parse(code, "python")
        fns = [s for s in symbols if s.kind == "function"]
        assert len(fns) == 1
        assert fns[0].name == "fetch_data"

    def test_decorated_function(self, ast_parser):
        code = "@app.route('/')\ndef index():\n    return 'hello'\n"
        symbols = ast_parser.parse(code, "python")
        fns = [s for s in symbols if s.kind == "function"]
        assert len(fns) == 1
        assert fns[0].name == "index"

    def test_empty_content(self, ast_parser):
        symbols = ast_parser.parse("", "python")
        assert symbols == []

    def test_unknown_language(self, ast_parser):
        symbols = ast_parser.parse("fn main() {}", "rust")
        assert symbols == []


class TestTypeScriptAST:
    def test_function_declaration(self, ast_parser):
        code = "function greet(name: string): string {\n  return `Hello ${name}`;\n}"
        symbols = ast_parser.parse(code, "typescript")
        fns = [s for s in symbols if s.kind == "function"]
        assert len(fns) == 1
        assert fns[0].name == "greet"

    def test_class_declaration(self, ast_parser):
        code = """class UserService {
    getUser(id: number) {
        return { id };
    }
}"""
        symbols = ast_parser.parse(code, "typescript")
        classes = [s for s in symbols if s.kind == "class"]
        assert len(classes) == 1
        assert classes[0].name == "UserService"

    def test_arrow_function_variable(self, ast_parser):
        code = "const handler = () => {\n  console.log('ok');\n};"
        symbols = ast_parser.parse(code, "typescript")
        fns = [s for s in symbols if s.kind == "function"]
        assert len(fns) == 1

    def test_import_statement(self, ast_parser):
        code = "import { useState } from 'react';\n"
        symbols = ast_parser.parse(code, "typescript")
        imports = [s for s in symbols if s.kind == "import"]
        assert len(imports) >= 1


class TestGoAST:
    def test_function_declaration(self, ast_parser):
        code = """func main() {
    fmt.Println("hello")
}"""
        symbols = ast_parser.parse(code, "go")
        fns = [s for s in symbols if s.kind == "function"]
        assert len(fns) == 1
        assert fns[0].name == "main"

    def test_struct_type(self, ast_parser):
        code = """type User struct {
    Name string
    Age  int
}"""
        symbols = ast_parser.parse(code, "go")
        structs = [s for s in symbols if s.kind == "struct"]
        assert len(structs) == 1
        assert structs[0].name == "User"


class TestJavaAST:
    def test_class_declaration(self, ast_parser):
        code = """public class HelloWorld {
    public static void main(String[] args) {}
}"""
        symbols = ast_parser.parse(code, "java")
        classes = [s for s in symbols if s.kind == "class"]
        assert len(classes) == 1
        assert classes[0].name == "HelloWorld"

    def test_method_detection(self, ast_parser):
        code = """public class Service {
    public String getName() { return "foo"; }
    private void process() {}
}"""
        symbols = ast_parser.parse(code, "java")
        methods = [s for s in symbols if s.kind == "method"]
        assert len(methods) == 2

    def test_interface_declaration(self, ast_parser):
        code = "public interface Repository<T> {\n  T findById(long id);\n}"
        symbols = ast_parser.parse(code, "java")
        interfaces = [s for s in symbols if s.kind == "interface"]
        assert len(interfaces) == 1
        assert interfaces[0].name == "Repository"
