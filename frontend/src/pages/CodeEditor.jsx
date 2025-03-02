import React, { useState, useEffect } from "react"
import axios from "axios"
import {
  Play,
  Trash,
  Copy,
  Download,
  Upload,
  Sun,
  Moon,
  Plus,
  FolderOpen,
  File,
  X,
  Settings,
  RefreshCw
} from "lucide-react"
import CodeMirror from "@uiw/react-codemirror"
import { cpp } from "@codemirror/lang-cpp"
import { java } from "@codemirror/lang-java"
import { javascript } from "@codemirror/lang-javascript"
import { python } from "@codemirror/lang-python"
import { githubLight } from "@uiw/codemirror-theme-github"
import { dracula } from "@uiw/codemirror-theme-dracula"
import toast from "react-hot-toast"

const languageOptions = [
  { value: "cpp", label: "C++", extension: ".cpp" },
  { value: "java", label: "Java", extension: ".java" },
  { value: "js", label: "JavaScript", extension: ".js" },
  { value: "python", label: "Python", extension: ".py" }
]

const getLanguageExtension = language => {
  const option = languageOptions.find(opt => opt.value === language)
  return option ? option.extension : ".txt"
}

const getLanguageFromExtension = filename => {
  const extension = filename.substring(filename.lastIndexOf("."))
  const option = languageOptions.find(opt => opt.extension === extension)
  return option ? option.value : "js"
}

const getLanguageConfig = language => {
  switch (language) {
    case "cpp":
      return cpp()
    case "java":
      return java()
    case "js":
      return javascript({ jsx: true, typescript: true })
    case "python":
      return python()
    default:
      return javascript({ jsx: true, typescript: true })
  }
}

const generateId = () =>
  Math.random()
    .toString(36)
    .substring(2, 9)

const DEFAULT_CODE_TEMPLATES = {
  cpp:
    '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}',
  java:
    'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
  js:
    'console.log("Hello, World!");\n\n// You can also define functions\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n\n// Call the function\nconst message = greet("Developer");\nconsole.log(message);',
  python:
    'print("Hello, World!")\n\n# You can also define functions\ndef greet(name):\n    return f"Hello, {name}!"\n\n# Call the function\nmessage = greet("Developer")\nprint(message)'
}

// Local JavaScript execution function
const executeJavaScript = code => {
  return new Promise(resolve => {
    let output = ""
    let error = ""

    // Create a safe console.log replacement
    const originalConsoleLog = console.log
    const originalConsoleError = console.error
    const originalConsoleWarn = console.warn
    const originalConsoleInfo = console.info

    try {
      // Override console methods to capture output
      console.log = (...args) => {
        output +=
          args
            .map(arg =>
              typeof arg === "object"
                ? JSON.stringify(arg, null, 2)
                : String(arg)
            )
            .join(" ") + "\n"
      }

      console.error = (...args) => {
        output +=
          "[ERROR] " +
          args
            .map(arg =>
              typeof arg === "object"
                ? JSON.stringify(arg, null, 2)
                : String(arg)
            )
            .join(" ") +
          "\n"
      }

      console.warn = (...args) => {
        output +=
          "[WARNING] " +
          args
            .map(arg =>
              typeof arg === "object"
                ? JSON.stringify(arg, null, 2)
                : String(arg)
            )
            .join(" ") +
          "\n"
      }

      console.info = (...args) => {
        output +=
          "[INFO] " +
          args
            .map(arg =>
              typeof arg === "object"
                ? JSON.stringify(arg, null, 2)
                : String(arg)
            )
            .join(" ") +
          "\n"
      }

      // Execute the code
      // eslint-disable-next-line no-new-func
      const result = new Function(code)()

      // If the code returns a value, add it to the output
      if (result !== undefined) {
        output +=
          "Return value: " +
          (typeof result === "object"
            ? JSON.stringify(result, null, 2)
            : result) +
          "\n"
      }

      resolve({ output, error })
    } catch (err) {
      error = err.toString()
      resolve({ output, error })
    } finally {
      // Restore original console methods
      console.log = originalConsoleLog
      console.error = originalConsoleError
      console.warn = originalConsoleWarn
      console.info = originalConsoleInfo
    }
  })
}



const CodeEditor = ({ darkMode, setDarkMode }) => {
  const [projects, setProjects] = useState(() => {
    const savedProjects = localStorage.getItem("codeEditorProjects")
    if (savedProjects) {
      return JSON.parse(savedProjects)
    }

    // Create default project with a single file
    const defaultFile = {
      id: generateId(),
      name: "main.js",
      language: "js",
      content: DEFAULT_CODE_TEMPLATES.js
    }

    return [
      {
        id: generateId(),
        name: "My Project",
        files: [defaultFile]
      }
    ]
  })

  const [currentProjectId, setCurrentProjectId] = useState(() => {
    return projects[0]?.id || ""
  })

  const [currentFileId, setCurrentFileId] = useState(() => {
    return projects[0]?.files[0]?.id || ""
  })

  const [output, setOutput] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [showFileModal, setShowFileModal] = useState(false)
  const [newFileName, setNewFileName] = useState("")
  const [newFileLanguage, setNewFileLanguage] = useState("js")
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false)
  const [useLocalExecution, setUseLocalExecution] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [fontSize, setFontSize] = useState(14)
  const [editorHeight, setEditorHeight] = useState(400)

  const currentProject =
    projects.find(p => p.id === currentProjectId) || projects[0]
  const currentFile =
    currentProject?.files.find(f => f.id === currentFileId) ||
    currentProject?.files[0]

  useEffect(() => {
    localStorage.setItem("codeEditorProjects", JSON.stringify(projects))
  }, [projects])

  useEffect(() => {
    const savedSettings = localStorage.getItem("codeEditorSettings")
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      setUseLocalExecution(settings.useLocalExecution ?? true)
      setFontSize(settings.fontSize ?? 14)
      setEditorHeight(settings.editorHeight ?? 400)
    }
  }, [])

  const saveSettings = () => {
    localStorage.setItem(
      "codeEditorSettings",
      JSON.stringify({
        useLocalExecution,
        fontSize,
        editorHeight
      })
    )
    setShowSettings(false)
    toast.success("Settings saved successfully!")
  }

  const handleCodeChange = value => {
    if (!currentProject || !currentFile) return

    setProjects(prevProjects =>
      prevProjects.map(project =>
        project.id === currentProject.id
          ? {
              ...project,
              files: project.files.map(file =>
                file.id === currentFile.id ? { ...file, content: value } : file
              )
            }
          : project
      )
    )
  }

  const runCode = async () => {
    if (!currentFile) return

    setOutput("")
    setError("")
    setIsLoading(true)

    try {
      // For JavaScript, we can run it directly in the browser
      if (currentFile.language === "js" && useLocalExecution) {
        const result = await executeJavaScript(currentFile.content)
        setOutput(result.output)
        if (result.error) {
          setError(result.error)
        }
      } else {
        // For other languages, use the API
        const response = await axios.post("http://localhost:5000/execute", {
          language: currentFile.language,
          code: currentFile.content
        })

        if (response.data.error) {
          setError(response.data.error)
        } else {
          setOutput(response.data.output)
        }
      }
    } catch (err) {
      console.error("Error Response:", err.response?.data)
      if (currentFile.language === "js" && useLocalExecution) {
        setError(err.toString())
      } else {
        setError(
          err.response?.data?.error ||
            "Execution failed. Please check your code."
        )

        if (err.response?.data?.details) {
          setError(prev => `${prev}\nDetails: ${err.response.data.details}`)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  const clearCode = () => {
    if (!currentProject || !currentFile) return

    if (window.confirm("Are you sure you want to clear this file?")) {
      setProjects(prevProjects =>
        prevProjects.map(project =>
          project.id === currentProject.id
            ? {
                ...project,
                files: project.files.map(file =>
                  file.id === currentFile.id ? { ...file, content: "" } : file
                )
              }
            : project
        )
      )
      setOutput("")
      setError("")
    }
  }

  const copyCode = () => {
    if (!currentFile) return

    navigator.clipboard.writeText(currentFile.content)
    toast.success("Code copied to clipboard!")
  }

  const downloadCode = () => {
    if (!currentFile) return

    const element = document.createElement("a")
    const file = new Blob([currentFile.content], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = currentFile.name
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const uploadCode = event => {
    const file = event.target.files?.[0]
    if (!file || !currentProject) return

    const reader = new FileReader()
    reader.onload = e => {
      const content = e.target?.result
      const fileName = file.name
      const language = getLanguageFromExtension(fileName)

      // Create a new file
      const newFile = {
        id: generateId(),
        name: fileName,
        language,
        content
      }

      setProjects(prevProjects =>
        prevProjects.map(project =>
          project.id === currentProject.id
            ? {
                ...project,
                files: [...project.files, newFile]
              }
            : project
        )
      )

      setCurrentFileId(newFile.id)
      toast.success(`File "${fileName}" uploaded successfully!`)
    }
    reader.readAsText(file)

    // Reset the input
    event.target.value = ""
  }

  const createNewProject = () => {
    if (!newProjectName.trim()) {
      toast.error("Project name cannot be empty")
      return
    }

    const defaultFile = {
      id: generateId(),
      name: "main.js",
      language: "js",
      content: DEFAULT_CODE_TEMPLATES.js
    }

    const newProject = {
      id: generateId(),
      name: newProjectName,
      files: [defaultFile]
    }

    setProjects([...projects, newProject])
    setCurrentProjectId(newProject.id)
    setCurrentFileId(defaultFile.id)
    setShowProjectModal(false)
    setNewProjectName("")
    toast.success(`Project "${newProjectName}" created!`)
  }

  const createNewFile = () => {
    if (!newFileName.trim() || !currentProject) {
      toast.error("File name cannot be empty")
      return
    }

    // Ensure file has correct extension
    let fileName = newFileName
    const extension = getLanguageExtension(newFileLanguage)
    if (!fileName.endsWith(extension)) {
      fileName += extension
    }

    // Check if file with same name already exists
    if (currentProject.files.some(f => f.name === fileName)) {
      toast.error(`File "${fileName}" already exists`)
      return
    }

    const newFile = {
      id: generateId(),
      name: fileName,
      language: newFileLanguage,
      content: DEFAULT_CODE_TEMPLATES[newFileLanguage] || ""
    }

    setProjects(prevProjects =>
      prevProjects.map(project =>
        project.id === currentProject.id
          ? {
              ...project,
              files: [...project.files, newFile]
            }
          : project
      )
    )

    setCurrentFileId(newFile.id)
    setShowFileModal(false)
    setNewFileName("")
    toast.success(`File "${fileName}" created!`)
  }

  const deleteFile = fileId => {
    if (!currentProject) return

    // Don't allow deleting the last file
    if (currentProject.files.length <= 1) {
      toast.error("Cannot delete the last file in a project")
      return
    }

    if (window.confirm("Are you sure you want to delete this file?")) {
      const updatedFiles = currentProject.files.filter(f => f.id !== fileId)

      setProjects(prevProjects =>
        prevProjects.map(project =>
          project.id === currentProject.id
            ? {
                ...project,
                files: updatedFiles
              }
            : project
        )
      )

      // If we're deleting the current file, switch to another file
      if (fileId === currentFileId) {
        setCurrentFileId(updatedFiles[0].id)
      }

      toast.success("File deleted successfully")
    }
  }

  const deleteProject = projectId => {
    // Don't allow deleting the last project
    if (projects.length <= 1) {
      toast.error("Cannot delete the last project")
      return
    }

    if (window.confirm("Are you sure you want to delete this project?")) {
      const updatedProjects = projects.filter(p => p.id !== projectId)
      setProjects(updatedProjects)

      // If we're deleting the current project, switch to another project
      if (projectId === currentProjectId) {
        setCurrentProjectId(updatedProjects[0].id)
        setCurrentFileId(updatedProjects[0].files[0].id)
      }

      toast.success("Project deleted successfully")
    }
  }

  const resetToTemplate = () => {
    if (!currentFile || !currentProject) return

    if (window.confirm("Reset this file to the default template?")) {
      const template = DEFAULT_CODE_TEMPLATES[currentFile.language] || ""

      setProjects(prevProjects =>
        prevProjects.map(project =>
          project.id === currentProject.id
            ? {
                ...project,
                files: project.files.map(file =>
                  file.id === currentFile.id
                    ? { ...file, content: template }
                    : file
                )
              }
            : project
        )
      )

      toast.success("File reset to template")
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        {/* Empty div to balance the layout */}
        <div className="w-1/3"></div>

        {/* Centered Logo */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-center flex-1">
          Compile<span className="text-blue-500">Space</span>
        </h1>

        {/* Settings & Theme Toggle (Right Corner) */}
        <div className="flex items-center space-x-2 w-1/3 justify-end">
          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Settings"
          >
            <Settings size={18} className="text-gray-900 dark:text-white" />
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? (
              <Sun className="text-yellow-400" size={18} />
            ) : (
              <Moon className="text-gray-700 dark:text-white" size={18} />
            )}
          </button>
        </div>
      </div>



      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
        {/* Project Explorer */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 overflow-auto max-h-[calc(100vh-200px)]">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold dark:text-white">Projects</h2>
            <button
              onClick={() => setShowProjectModal(true)}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              title="New Project"
            >
              <Plus size={18} className="dark:text-white" />
            </button>
          </div>

          <div className="space-y-2">
            {projects.map(project => (
              <div key={project.id} className="relative">
                <div
                  className={`flex justify-between items-center p-2 rounded cursor-pointer ${
                    project.id === currentProjectId
                      ? "bg-blue-100 dark:bg-blue-900"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => {
                    setCurrentProjectId(project.id)
                    setCurrentFileId(project.files[0].id)
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <FolderOpen
                      size={18}
                      className={
                        project.id === currentProjectId
                          ? "text-blue-600 dark:text-blue-400"
                          : "dark:text-white"
                      }
                    />
                    <span className="truncate dark:text-white">
                      {project.name}
                    </span>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      deleteProject(project.id)
                    }}
                    className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900"
                    title="Delete Project"
                  >
                    <X size={16} className="text-red-500" />
                  </button>
                </div>

                {project.id === currentProjectId && (
                  <div className="ml-4 mt-2 space-y-1">
                    {project.files.map(file => (
                      <div
                        key={file.id}
                        className={`flex justify-between items-center p-2 rounded cursor-pointer ${
                          file.id === currentFileId
                            ? "bg-blue-100 dark:bg-blue-900"
                            : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                        onClick={() => setCurrentFileId(file.id)}
                      >
                        <div className="flex items-center space-x-2">
                          <File
                            size={16}
                            className={
                              file.id === currentFileId
                                ? "text-blue-600 dark:text-blue-400"
                                : "dark:text-white"
                            }
                          />
                          <span className="truncate dark:text-white">
                            {file.name}
                          </span>
                        </div>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            deleteFile(file.id)
                          }}
                          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900"
                          title="Delete File"
                        >
                          <X size={14} className="text-red-500" />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={() => setShowFileModal(true)}
                      className="flex items-center space-x-1 p-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded w-full"
                    >
                      <Plus size={14} />
                      <span>Add New File</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Code Editor and Output */}
        <div className="lg:col-span-3 space-y-4">
          {/* Code Editor */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm dark:text-white">
                  {currentFile?.name || "Untitled"}
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    (
                    {languageOptions.find(
                      l => l.value === currentFile?.language
                    )?.label || "Unknown"}
                    )
                  </span>
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={resetToTemplate}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  title="Reset to Template"
                >
                  <RefreshCw size={16} className="dark:text-white" />
                </button>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="file"
                    accept=".js,.py,.java,.cpp,.txt"
                    onChange={uploadCode}
                    className="sr-only"
                  />
                  <button
                    onClick={() =>
                      document.querySelector('input[type="file"]')?.click()
                    }
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="Upload File"
                  >
                    <Upload size={16} className="dark:text-white" />
                  </button>
                </label>
                <button
                  onClick={downloadCode}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  title="Download File"
                >
                  <Download size={16} className="dark:text-white" />
                </button>
                <button
                  onClick={copyCode}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  title="Copy Code"
                >
                  <Copy size={16} className="dark:text-white" />
                </button>
              </div>
            </div>

            <CodeMirror
              value={currentFile?.content || ""}
              height={`${editorHeight}px`}
              theme={darkMode ? dracula : githubLight}
              extensions={[getLanguageConfig(currentFile?.language || "js")]}
              onChange={handleCodeChange}
              className="text-sm"
              style={{ fontSize: `${fontSize}px` }}
            />

            <div className="flex gap-2 p-2 bg-gray-100 dark:bg-gray-700">
              <button
                onClick={runCode}
                disabled={isLoading}
                className={`bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-1 ${
                  isLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <Play size={16} /> {isLoading ? "Running..." : "Run"}
              </button>
              <button
                onClick={clearCode}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded flex items-center gap-1"
              >
                <Trash size={16} /> Clear
              </button>
            </div>
          </div>

          {/* Output Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <h3 className="text-lg font-semibold mb-2 dark:text-white">
              Output
            </h3>
            {output && (
              <pre className="p-3 bg-gray-100 dark:bg-gray-900 border rounded font-mono text-green-700 dark:text-green-400 overflow-auto max-h-60">
                {output}
              </pre>
            )}
            {error && (
              <pre className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-500 rounded font-mono text-red-700 dark:text-red-400 overflow-auto max-h-60">
                {error}
              </pre>
            )}
            {!output && !error && (
              <div className="p-3 bg-gray-100 dark:bg-gray-900 border rounded text-gray-500 dark:text-gray-400 font-mono">
                Run your code to see output here
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4 dark:text-white">
              Create New Project
            </h2>
            <input
              type="text"
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              placeholder="Project Name"
              className="w-full p-2 border rounded mb-4 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowProjectModal(false)}
                className="px-4 py-2 border rounded hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={createNewProject}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New File Modal */}
      {showFileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4 dark:text-white">
              Create New File
            </h2>
            <div className="mb-4">
              <input
                type="text"
                value={newFileName}
                onChange={e => setNewFileName(e.target.value)}
                placeholder="File Name (without extension)"
                className="w-full p-2 border rounded mb-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                autoFocus
              />
              <select
                value={newFileLanguage}
                onChange={e => setNewFileLanguage(e.target.value)}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {languageOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.extension})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowFileModal(false)}
                className="px-4 py-2 border rounded hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={createNewFile}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4 dark:text-white">
              Editor Settings
            </h2>

            {/* <div className="mb-4">
              <label className="flex items-center dark:text-white">
                <input
                  type="checkbox"
                  checked={useLocalExecution}
                  onChange={e => setUseLocalExecution(e.target.checked)}
                  className="mr-2"
                />
                Run JavaScript locally in browser
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                When enabled, JavaScript code will run directly in your browser
                without needing a server.
              </p>
            </div> */}

            <div className="mb-4">
              <label className="block dark:text-white mb-1">Font Size</label>
              <div className="flex items-center">
                <input
                  type="range"
                  min="10"
                  max="24"
                  value={fontSize}
                  onChange={e => setFontSize(parseInt(e.target.value))}
                  className="w-full mr-2"
                />
                <span className="dark:text-white">{fontSize}px</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block dark:text-white mb-1">
                Editor Height
              </label>
              <div className="flex items-center">
                <input
                  type="range"
                  min="200"
                  max="800"
                  step="50"
                  value={editorHeight}
                  onChange={e => setEditorHeight(parseInt(e.target.value))}
                  className="w-full mr-2"
                />
                <span className="dark:text-white">{editorHeight}px</span>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 border rounded hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-10 py-4 text-center border-t border-gray-300 text-gray-500">
        <div className="flex flex-col items-center gap-2">
          <p>
            © 2025 CompileSpace<br />
            Designed by 
            <a href="https://www.linkedin.com/in/prathamesh-kapadne/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline"> Prathamesh </a> 
            & 
            <a href="https://www.linkedin.com/in/yashborkar/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline"> Yash</a>
          </p>
        </div>
      </footer>


    </div>
  )
}

export default CodeEditor
