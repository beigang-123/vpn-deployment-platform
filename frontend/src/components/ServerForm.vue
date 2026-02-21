<template>
  <el-form
    ref="formRef"
    :model="formData"
    :rules="rules"
    label-width="120px"
    label-position="left"
  >
    <el-form-item label="服务器 IP" prop="serverIp">
      <el-input
        v-model="formData.serverIp"
        placeholder="请输入服务器 IP 地址"
        clearable
      >
        <template #prefix>
          <el-icon><Monitor /></el-icon>
        </template>
      </el-input>
    </el-form-item>

    <el-form-item label="SSH 端口" prop="sshPort">
      <el-input-number
        v-model="formData.sshPort"
        :min="1"
        :max="65535"
        :step="1"
        placeholder="22"
        style="width: 100%"
      />
    </el-form-item>

    <el-form-item label="用户名" prop="username">
      <el-input
        v-model="formData.username"
        placeholder="请输入 SSH 用户名"
        clearable
      >
        <template #prefix>
          <el-icon><User /></el-icon>
        </template>
      </el-input>
    </el-form-item>

    <el-form-item label="密码" prop="password">
      <el-input
        v-model="formData.password"
        type="password"
        placeholder="请输入 SSH 密码"
        show-password
        clearable
      >
        <template #prefix>
          <el-icon><Lock /></el-icon>
        </template>
      </el-input>
    </el-form-item>

    <el-form-item label="私钥（可选）">
      <el-input
        v-model="formData.privateKey"
        type="textarea"
        :rows="4"
        placeholder="粘贴用于 SSH 认证的私钥"
        clearable
      />
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Monitor, User, Lock } from '@element-plus/icons-vue';
import { useDeployStore } from '@/stores/deploy';

const deployStore = useDeployStore();

const formRef = ref();
const formData = reactive({
  serverIp: '',
  sshPort: 22,
  username: 'root',
  password: '',
  privateKey: '',
});

const rules = {
  serverIp: [
    { required: true, message: '请输入服务器 IP', trigger: 'blur' },
    {
      pattern: /^(\d{1,3}\.){3}\d{1,3}$|^[\w-]+(\.[\w-]+)+$/,
      message: '请输入有效的 IP 地址或域名',
      trigger: 'blur',
    },
  ],
  sshPort: [
    { required: true, message: '请输入 SSH 端口', trigger: 'blur' },
    { type: 'number', min: 1, max: 65535, message: '端口范围应为 1-65535', trigger: 'blur' },
  ],
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
  ],
};

// Watch for changes and update store
watch(
  formData,
  (newData) => {
    deployStore.setServerInfo(newData);
  },
  { deep: true }
);

// Validate form
const validate = async (): Promise<boolean> => {
  try {
    await formRef.value?.validate();
    return true;
  } catch (error) {
    ElMessage.error('请正确填写所有必填字段');
    return false;
  }
};

// Reset form
const reset = () => {
  formRef.value?.resetFields();
};

defineExpose({
  validate,
  reset,
});
</script>

<style scoped>
.el-form {
  max-width: 600px;
}
</style>
