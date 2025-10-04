// __tests__/Login.test.jsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Login from "../src/pages/login";
import axios from "axios";
import { MemoryRouter } from "react-router-dom";

jest.mock("axios");

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe("Login Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("does not render form initially if authenticated", async () => {
    axios.get.mockResolvedValue({ data: { user: { id: 1 } } });
    render(<Login />, { wrapper: MemoryRouter });

    // Wait for useEffect to finish
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    expect(screen.queryByPlaceholderText("Email")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Password")).not.toBeInTheDocument();
  });

  test("renders login form if not authenticated", async () => {
    axios.get.mockResolvedValue({ data: {} });
    render(<Login />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    });
  });

  test("submits form and navigates on successful login", async () => {
    axios.get.mockResolvedValue({ data: {} }); // not authenticated
    axios.post.mockResolvedValue({ data: { success: true } });

    render(<Login />, { wrapper: MemoryRouter });

    const emailInput = await screen.findByPlaceholderText("Email");
    const passwordInput = await screen.findByPlaceholderText("Password");

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByText("Login"));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/login"),
        { username: "test@example.com", password: "password123" },
        { withCredentials: true }
      );
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  test("alerts on failed login", async () => {
    window.alert = jest.fn();
    axios.get.mockResolvedValue({ data: {} });
    axios.post.mockResolvedValue({ data: { success: false, message: "Wrong creds" } });

    render(<Login />, { wrapper: MemoryRouter });

    const emailInput = await screen.findByPlaceholderText("Email");
    const passwordInput = await screen.findByPlaceholderText("Password");

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "fail@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "wrongpass" },
    });

    fireEvent.click(screen.getByText("Login"));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Wrong creds");
    });
  });

  test("register button navigates to /register", async () => {
    axios.get.mockResolvedValue({ data: {} });
    render(<Login />, { wrapper: MemoryRouter });

    await waitFor(() => {
      fireEvent.click(screen.getByText("Register"));
      expect(mockNavigate).toHaveBeenCalledWith("/register");
    });
  });
});
